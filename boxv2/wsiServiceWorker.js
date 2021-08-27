importScripts("./geotiff.js")

self.oninstall = () => {
  self.skipWaiting()
}

self.onactivate = () => {
  self.clients.claim()
}

const indexedDBConfig = {
  'box': {
    'dbName': "boxCreds",
    'objectStoreName': "oauth",
    'objectStoreOpts': {
      'autoIncrement': true
    }
  }
}

const tileServerBasePath = location.host.includes("localhost") ? "http://localhost:8081/iiif" : "https://episphere.github.io/svs/boxv2/iiif"
const imageInfoContext = "http://iiif.io/api/image/2/context.json"
let tiff = {}

utils = {
  request: (url, opts) => 
    fetch(url, opts)
    .then(res => {
      if (res.ok) {
        return res
      } else {
        throw Error(res.status)
      }
    })
}

const fetchIndexedDBInstance = (key) => new Promise((resolve) => {
  indexedDB.open(indexedDBConfig[key].dbName).onsuccess = (evt) => {
    dbInstance = evt.target.result
    resolve(dbInstance)
  }
})

fetchIndexedDBInstance("box").then(db => {
  boxCredsDB = db
})
// let pool = new GeoTIFF.Pool(Math.floor(navigator.hardwareConcurrency/2))

// const checkBoxURLValidity = async (imageId) => {
//   if (!imagePyramid[imageId]) {
//     imagePyramid[imageId] = {}
//   }

//   // Box URLs expire in 15 mins, so checking to see if enough time has elapsed for the load failure reason to be URL expiry.
//   if (!imagePyramid[imageId].imageURL || Date.now() > imagePyramid[imageId].loadedAt + 14 * 60 * 1000) {
//     const refreshedFileURL = await getFileContentFromBox(imageId, true, false)
//     imagePyramid[imageId].imageURL = refreshedFileURL
//     imagePyramid[imageId].loadedAt = Date.now()
//   }
// }

const getFileContentFromBox = (id, urlOnly=true, responseType="json") => {
  const contentEndpoint = `https://api.box.com/2.0/files/${id}/content`
  
  return new Promise(async (resolve) => {
    boxCredsDB = await fetchIndexedDBInstance('box')
    boxCredsDB.transaction(indexedDBConfig['box'].objectStoreName, "readonly").objectStore(indexedDBConfig['box'].objectStoreName).get(1).onsuccess = async (evt) => {
      const { access_token: accessToken } = evt.target.result
      const requestOpts = {
        'headers': {
          'Authorization': `Bearer ${accessToken}`
        }
      }
      let resp = undefined

      try {
        if (urlOnly) {
          const ac = new AbortController()
          requestOpts['signal'] = ac.signal
          resp = await utils.request(contentEndpoint, requestOpts)
          ac.abort()
          resolve(resp.url)
        } else {
          resp = await utils.request(contentEndpoint, requestOpts)
    
          if (responseType === "json") {
            resp = await resp.json()
          } else if (responseType === "buffer") {
            resp = await resp.arrayBuffer()
          } else if (responseType === "blob") {
            resp = await resp.blob()
          } else {
            resp = await resp.text()
          }
          resolve(resp)
        }
      } catch (e) {
        if (e.message === "404") {
          throw Error(e.message)
        }
      }
    }
  })
}

const getImageInfo = async (imageIdentifier) => {
  await getImagesInPyramid(imageIdentifier, true)
  let pixelsPerMeter
  const img = await tiff[imageIdentifier].image.getImage(0)
  const micronsPerPixel = img?.fileDirectory?.ImageDescription?.split("|").find(s => s.includes("MPP")).split("=")[1].trim()
  if (micronsPerPixel) {
    pixelsPerMeter = 1 / (parseFloat(micronsPerPixel) * Math.pow(10, -6))
  }
  const response = new Response(
    JSON.stringify({
      width: img.getWidth(),
      height: img.getHeight(),
      pixelsPerMeter,
      "@context": imageInfoContext,
    }), { status: 200 }
  )
  return response
}

const refreshImageURLFromBox = async (imageId) => {
  tiff[imageId].imageURL = await getFileContentFromBox(imageId, true)
  tiff[imageId].imageLoadedAt = Date.now()
}

const getImagesInPyramid = (imageIdentifier, firstOnly=false) =>
  new Promise(async (resolve, reject) => {
    tiff[imageIdentifier] = tiff[imageIdentifier] || {}
    // if (!tiff[imageId].imageURL || Date.now() > (tiff[imageId].imageLoadedAt + 14*60*1000)) {
    //   await refreshImageURLFromBox(imageId)
    // }
    console.log(imageIdentifier)
    try {
      tiff[imageIdentifier].image = tiff[imageIdentifier].image || ( await GeoTIFF.fromUrl(imageIdentifier, { cache: false }) )

      const imageCount = await tiff[imageIdentifier].image.getImageCount()
      if (tiff[imageIdentifier].image.loadedCount !== imageCount) {
        tiff[imageIdentifier].image.loadedCount = 0
      
        for (let i = 0; i < imageCount - 2; i++) {
          tiff[imageIdentifier].image.getImage(i).then(() => tiff[imageIdentifier].image.loadedCount++)
          if (firstOnly) {
            break
          }
        }
        const imagePromises = await Promise.allSettled(Array.from(Array(imageCount - 2), (_, ind) => tiff[imageIdentifier].image.getImage(ind) ))
        tiff[imageIdentifier].image.loadedCount = imagePromises.filter(v => v.status === "fulfilled").length
        resolve()
        return
      }
  
    } catch (e) {
      console.log("Couldn't get images", e)
      reject(e)
    }
  })

const getImageIndexByRatio = async (imageId, tileWidthRatio) => {
  if (!tiff[imageId].image.imageWidthRatios) {
    tiff[imageId].image.imageWidthRatios = []
    for (let imageIndex = 0; imageIndex < tiff[imageId].image.loadedCount; imageIndex++) {
      const imageWidth = (await tiff[imageId].image.getImage(imageIndex)).getWidth()
      const bestImageWidth = (await tiff[imageId].image.getImage(0)).getWidth()
      tiff[imageId].image.imageWidthRatios.push(bestImageWidth / imageWidth)
    } 
  }
  const sortedRatios = [...tiff[imageId].image.imageWidthRatios].sort((a, b) => a - b).slice(0, -1) // Remove thumbnail from consideration
  if (tileWidthRatio > 8) {
    return tiff[imageId].image.imageWidthRatios.indexOf(sortedRatios[sortedRatios.length - 1])
  } else if (tileWidthRatio <= 2 && tileWidthRatio > 0) {
    return 0 // Return first image for high magnification tiles
  } else {
    if (sortedRatios.length === 3) {
      return tiff[imageId].image.imageWidthRatios.indexOf(sortedRatios[sortedRatios.length - 2])
    } else if (sortedRatios.length > 3) {
      if (tileWidthRatio > 4) {
        return tiff[imageId].image.imageWidthRatios.indexOf(sortedRatios[sortedRatios.length - 2])
      } else {
        return tiff[imageId].image.imageWidthRatios.indexOf(sortedRatios[sortedRatios.length - 3])
      }
    }
  }
}

const getImageTile = async (imageIdentifier, tileParams) => {
  const parsedTileParams = Object.entries(tileParams).reduce((parsed, [key, val]) => {
    if (val) {
      parsed[key] = parseInt(val)
    }
    return parsed
  }, {})
  
  const { tileTopX, tileTopY, tileWidth, tileHeight, tileWidthToRender } = parsedTileParams
  if (!Number.isInteger(tileTopX) || !Number.isInteger(tileTopY) || !Number.isInteger(tileWidth) || !Number.isInteger(tileHeight) || !Number.isInteger(tileWidthToRender)) {
    console.error("Tile Request missing critical parameters!", tileTopX, tileTopY, tileWidth, tileHeight, tileWidthToRender)
    return
  }

  // if (tiff[imageIdentifier]?.imageLoadedAt + 14*60*1000 < Date.now()) {
  //   await refreshImageURLFromBox(imageIdentifier)
  // }

  if (!tiff[imageIdentifier]?.image || tiff[imageIdentifier].image.loadedCount === 0) {
    await getImagesInPyramid(imageIdentifier, false)
  }

  const tileWidthRatio = Math.floor(tileWidth / tileWidthToRender)
  const bestImageIndex = await getImageIndexByRatio(imageIdentifier, tileWidthRatio)
  // const bestImageIndex = parsedTileParams.bestImageIndex >= 0 ? parsedTileParams.bestImageIndex : getImageIndexByRatio(imageIdentifier, tileWidthRatio)
  console.log("BEST INDEX", bestImageIndex, "\n")
  const bestImageInTiff = await tiff[imageIdentifier].image.getImage(bestImageIndex)
  const bestImageWidth = bestImageInTiff.getWidth()
  const bestImageHeight = bestImageInTiff.getHeight()
  const tileHeightToRender = Math.floor(tileHeight * tileWidthToRender / tileWidth)

  const tileInImageLeftCoord = Math.floor(tileTopX * bestImageWidth / (await tiff[imageIdentifier].image.getImage(0)).getWidth())
  const tileInImageTopCoord = Math.floor(tileTopY * bestImageHeight / (await tiff[imageIdentifier].image.getImage(0)).getHeight())
  const tileInImageRightCoord = Math.floor((tileTopX + tileWidth) * bestImageWidth / (await tiff[imageIdentifier].image.getImage(0)).getWidth())
  const tileInImageBottomCoord = Math.floor((tileTopY + tileHeight) * bestImageHeight / (await tiff[imageIdentifier].image.getImage(0)).getHeight())
  // console.log("REQUESTED CO-ORDS:", tileTopX, tileTopY, tileWidth, tileHeight, "\n")
  // console.log("CALCULATED CO-ORDS:", tileInImageLeftCoord, tileInImageTopCoord, tileInImageRightCoord, tileInImageBottomCoord, "\n")
  // debugger
  // console.log(bestImageIndex,"tileWidthToRender:",tileWidthToRender, "tileHeightToRender:",tileHeightToRender, "tileInImageLeftCoord:",tileInImageLeftCoord, "tileInImageTopCoord:",tileInImageTopCoord, "tileInImageRightCoord:",tileInImageRightCoord, "tileInImageBottomCoord:",tileInImageBottomCoord)
  const x = Date.now()

  let data = await bestImageInTiff.readRasters({
    width: tileWidthToRender,
    height: tileHeightToRender,
    window: [
      tileInImageLeftCoord,
      tileInImageTopCoord,
      tileInImageRightCoord,
      tileInImageBottomCoord,
    ],
  })
  console.log('Time Taken:', Date.now() - x)

  let imageData = []
  data[0].forEach((val, ind) => {
    imageData.push(val)
    imageData.push(data[1][ind])
    imageData.push(data[2][ind])
    imageData.push(255)
  })

  const cv = new OffscreenCanvas(tileWidthToRender, tileHeightToRender)
  const ctx = cv.getContext("2d")
  ctx.putImageData( new ImageData(Uint8ClampedArray.from(imageData), tileWidthToRender, tileHeightToRender), 0, 0 )
  const blob = await cv.convertToBlob({
    type: "image/jpeg",
    quality: 1.0,
  })

  const response = new Response(blob, { status: 200 })
  // console.log(response)
  return response
}

self.addEventListener("fetch", (e) => {
  if (e.request.url.startsWith(tileServerBasePath)) {
    let regex = new RegExp(tileServerBasePath + "\/(?<identifier>.[^/]*)\/")
    const { identifier } = regex.exec(e.request.url).groups

    if (e.request.url.endsWith("/info.json")) {
      e.respondWith(getImageInfo(decodeURIComponent(identifier)))
      return
   
    } else if (e.request.url.includes("/full/")) {
      e.respondWith(new Response(JSON.stringify({}), { status: 404 }))
   
    } else if (e.request.url.endsWith("/default.jpg")) {
      regex = /\/(?<tileTopX>[0-9]+?),(?<tileTopY>[0-9]+?),(?<tileWidth>[0-9]+?),(?<tileHeight>[0-9]+?)\/(?<tileWidthToRender>[0-9]+?),[0-9]*?\/(?<tileRotation>[0-9]+?)\//
      const tileParams = regex.exec(e.request.url).groups
      e.respondWith(getImageTile(decodeURIComponent(identifier), tileParams))
    }
  
  }
})
