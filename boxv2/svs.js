svs = {}
const client_id = window.location.host.includes("localhost") ? "52zad6jrv5v52mn1hfy1vsjtr9jn5o1w" : "1n44fu5yu1l547f2n2fgcw7vhps7kvuw"
const client_secret = window.location.host.includes("localhost") ? "2rHTqzJumz8s9bAjmKMV83WHX1ooN4kT" : "2ZYzmHXGyzBcjZ9d1Ttsc1d258LiGGVd"
const state = "sALTfOrSEcUrITy"
const redirect_uri = window.location.host.includes("localhost") ? "http://localhost:8081/boxv2/" : "https://episphere.github.io/svs/boxv2"
const indexedDBConfig = {
  'box': {
    'dbName': "boxCreds",
    'objectStoreName': "oauth",
    'objectStoreOpts': {
      'autoIncrement': true
    }
  }
}

const boxAuthEndpoint = encodeURI(`https://account.box.com/api/oauth2/authorize?response_type=code&client_id=${client_id}&state=${state}&redirect_uri=${redirect_uri}`)
const boxAccessTokenEndpoint = "https://api.box.com/oauth2/token"
const boxAppBasePath = "https://nih.app.box.com"
const boxBasePath = "https://api.box.com/2.0"

svs.serverBasePath = window.location.host.includes("localhost") ? "http://localhost:8081/iiif" : "https://episphere.github.io/svs/boxv2/iiif"

const roundToPrecision = (value, precision) => Math.round((parseFloat(value)  + Number.EPSILON) * 10**precision) / 10**precision

var hashParams = {}
localStorage.hashParams = ""
const loadHashParams = async () => {
  const previousHashParams = window.localStorage.hashParams ? JSON.parse(window.localStorage.hashParams) : {}
  hashParams = {}
  if (window.location.hash.includes("=")) {
    window.location.hash.slice(1).split('&').forEach(param => {
      let [key, value] = param.split('=')
      value = value.replace(/['"]+/g, "") // for when the hash parameter contains quotes.
      value = decodeURIComponent(value)
      if (key === "extModules") {
        try {
          window.localStorage.extModules = value
          hashParams[key] = eval(value) // for when the extModules parameter is an array/object.
        } catch (e) { // If eval doesn't work, just add the value as a string.
          console.warn("The extModules parameter should be either be a URL without quotes or a proper array containing individual URL(s) inside quotes!", e)
          hashParams[key] = value
        }
      } else {
        hashParams[key] = value
      }
    })
  }
  
  if (hashParams["fileURL"] && previousHashParams?.fileURL !== hashParams["fileURL"]) {
    svs.progressBar(false)
    svs.loadImage(hashParams["fileURL"])
  } else if (await isLoggedIn()){
    if (hashParams["boxFileId"] && previousHashParams?.boxFileId !== hashParams["boxFileId"]) {
      svs.progressBar(false)
      svs.loadBoxImageFromId(hashParams["boxFileId"])
    } else if (hashParams["boxFilename"] && previousHashParams?.boxFilename !== hashParams["boxFilename"]) {
      svs.progressBar(false)
      svs.loadBoxImageFromFilename(decodeURIComponent(hashParams["boxFilename"]))
    }

  }

  if (hashParams.wsiCenterX && hashParams.wsiCenterY && hashParams.wsiZoom) {
    svs.handlePanAndZoom(hashParams.wsiCenterX, hashParams.wsiCenterY, hashParams.wsiZoom)
  }

  if (hashParams["extModules"]) {
    svs.loadModules()
  }
  window.localStorage.hashParams = JSON.stringify(hashParams)
}

const urlParams = {}
const loadURLParams = () => {
  if(window.location.search.length > 0) {
    window.location.search.slice(1).split('&').forEach(param => {
      const [key, value] = param.split('=')
      urlParams[key] = value
    })
  }
}

svs.modifyHashString = (hashObj, removeFromHistory=false) => {
  // hashObj contains hash keys with corresponding values to update. To remove a hash parameter, the
  // value corresponding to the hash param should be undefined in the hashObj.
  let hash = decodeURIComponent(window.location.hash)
  Object.entries(hashObj).forEach(([key, val]) => {
    if (val && val !== hashParams[key]) {
     
      if (hashParams[key]) {
        hash = hash.replace(`${key}=${hashParams[key]}`, `${key}=${val}`)
      } else {
        hash += hash.length > 0 ? "&" : ""
        hash += `${key}=${val}`
      }
  
    } else if (!val) {
      const param = `${key}=${hashParams[key]}`
      const paramIndex = hash.indexOf(param)
      if (hash[paramIndex-1] === "&") {  // if hash is of the form "...&image=123...", remove preceding & as well.
        hash = hash.replace(`&${param}`, "")
      } else if (hash[paramIndex + param.length] === "&") { // if hash is of the form "#image=123&...", remove following & as well.
        hash = hash.replace(`${param}&`, "")
      } else { // if hash is just #image=123, remove just the param.
        hash = hash.replace(param, "")
      }
    }
  })
  window.location.hash = hash

  if (removeFromHistory) {
    history.replaceState({}, '', window.location.pathname + window.location.hash)
  }
}

svs.loadModules = (modules) => {
  modules = modules || hashParams["extModules"]

  const loadModule = (modulePath) => {
    console.log(`Loading external module at ${modulePath}`)
    const scriptElement = document.createElement('script')
    scriptElement.src = modulePath
    scriptElement.async = ""
    scriptElement.type = "text/javascript"
    document.head.appendChild(scriptElement)
  }

  if (modules) {
    if (Array.isArray(modules)) {
      modules.forEach(modulePath => loadModule(modulePath))
    } else if (typeof (modules) === "string") {
      loadModule(modules)
    }
  }
}

svs.setupIndexedDB = (dbName, objectStoreName, objectStoreOpts={}, indexOpts) => {
  return new Promise(resolve => {
    const dbRequest = window.indexedDB.open(dbName)
    dbRequest.onupgradeneeded = () => {
      const db = dbRequest.result
      if (!db.objectStoreNames.contains(objectStoreName)) {
        const objectStore = db.createObjectStore(objectStoreName, objectStoreOpts)
        if (indexOpts) {
          objectStore.createIndex(indexOpts.name, indexOpts.keyPath, indexOpts.objectParameters)
        }
      }
      resolve(db)
    }
    dbRequest.onsuccess = (evt) => {
      const db = evt.target.result
      resolve(db)
    }
  })
}

svs.setupIndexedDB(...Object.values(indexedDBConfig['box'])).then(db => {
  svs.boxCredsDB = db
})

const isLoggedIn = async () => {
  if (window.localStorage.box) {
    const boxCreds = JSON.parse(window.localStorage.box)
    if (boxCreds["access_token"] && boxCreds["expires_in"]) {
      if (boxCreds["created_at"] + ((boxCreds["expires_in"] - 2 * 60) * 1000) < Date.now()) {
        try {
          await getAccessToken('refresh_token', boxCreds["refresh_token"])
        } catch (err) {
          console.log(err)
          return false
        }
      }
      return true
    }
  }
  return false
}

const getAccessToken = async (type, token) => {
  const requestType = type === "refresh_token" ? type : "code"
  try {
    const resp = await (await fetch(boxAccessTokenEndpoint, {
      'method': "POST",
      'body': `grant_type=${type}&${requestType}=${token}&client_id=${client_id}&client_secret=${client_secret}`,
      'headers': {
        'Content-Type': "application/x-www-form-urlencoded"
      }
    })).json()
    if (resp["access_token"]) {
      storeCredsToLS(resp)
      return true
    }
  } catch (err) {
    console.log("ERROR Retrieving Box Access Token!", err)
    throw new Error(err)
  }
  throw new Error("Failed to get access token from Box!", type)
}

const storeCredsToLS = (boxCreds) => {
  const newCreds = {
    'created_at': Date.now(),
    ...boxCreds
  }
  window.localStorage.box = JSON.stringify(newCreds)
  storeCredsToIndexedDB(newCreds)
}

const storeCredsToIndexedDB = (boxCreds) => {
  svs.boxCredsDB.transaction(indexedDBConfig['box'].objectStoreName, "readwrite").objectStore(indexedDBConfig['box'].objectStoreName).put(boxCreds, 1)
  if (svs.refreshTokenBeforeExpiry) {
    clearTimeout(svs.refreshTokenBeforeExpiry)
  }

  svs.refreshTokenBeforeExpiry = setTimeout(() => {
    console.log("REFRESH SUCCESSFUL", (boxCreds.expires_in - (2*60)) * 1000)
    isLoggedIn()
    svs.loginSuccess()
  }, (boxCreds.expires_in - (2*60)) * 1000)
  // }, 30*1000)
}

// svs.saveFile = function (x, fileName) { // x is the content of the file
//   var bb = new Blob([x]);
//   var url = URL.createObjectURL(bb);
//   var a = document.createElement('a');
//   a.href = url;
//   if (fileName) {
//     if (typeof (fileName) == "string") { // otherwise this is just a boolean toggle or something of the sort
//       a.download = fileName;
//     }
//     a.click() // then download it automatically 
//   }
//   return a
// }

// svs.readCSV = async (url = 'HALO All Sherlock IDs 07282020_HP0493-001-007.csv') => {
//   let txt = await (await fetch(url)).text()
//   return txt
// }
// svs.readJSON = async (url = 'HALO All Sherlock IDs 07282020_HP0493-001-007.json') => {
//   xx = await (await fetch(url)).json()
//   return xx
// }

svs.loadWSIFromURL = () => document.getElementById("imageURL").value.length > 0 ? svs.modifyHashString({'fileURL': document.getElementById("imageURL").value }) : {}

svs.progressBar = (show=true) => {
  if (show) {
    document.getElementById("progressBarContainer").style.opacity = 1
    let progressBarCurrentWidth = 0
    let moveAheadBy = 2
    svs.progressBarMover = setInterval(() => {
      if (progressBarCurrentWidth > 35 && progressBarCurrentWidth < 65) {
        moveAheadBy = 0.75
      } else if (progressBarCurrentWidth >= 65 && progressBarCurrentWidth < 90) {
        moveAheadBy = 0.3
      } else if (progressBarCurrentWidth >= 90 && progressBarCurrentWidth < 95) {
        moveAheadBy = 0.01
      } else if (progressBarCurrentWidth >= 95 && progressBarCurrentWidth < 100) {
        moveAheadBy = 0
      }
      progressBarCurrentWidth += moveAheadBy
      progressBarCurrentWidth = progressBarCurrentWidth < 100 ? progressBarCurrentWidth : 100
      document.getElementById("progressBar").style.width = `${progressBarCurrentWidth}%`
    }, 200)
  } else if (svs.progressBarMover) {
    clearInterval(svs.progressBarMover)
    delete svs.progressBarMover
    setTimeout(() => {
      setTimeout(() => {
        document.getElementById("progressBar").style.width = "0%"
      }, 700)
      document.getElementById("progressBarContainer").style.opacity = "0"
    }, 700)
    
    document.getElementById("progressBar").style.width = "100%"
  }
}

svs.loadBoxImageFromFilename = async (filename) => {
  svs.progressBar(true)
  const { entries } = await (await svs.searchBoxByFilename(filename)).json()
  if (entries?.[0]?.id) {
    svs.loadBoxImageFromId(entries[0].id, filename)
  }
  // const 
  // const targetNode = document.getElementById('filePickerContainer');

  // const config = { attributes: false, childList: true, subtree: true };

  // const callback = (mutationsList, observer) => {
  //   mutationsList.forEach(mutation => {
  //     if (mutation.type === 'childList' && mutation.addedNodes[0]?.className === "bcp-item-grid") {
  //         observer.disconnect()
  //         targetNode.querySelector(".be-search input").value = ""
  //         targetNode.querySelector(".be-search input").value = ""
  //     }
  //   })
  // }

  // const observer = new MutationObserver(callback);
  // observer.observe(targetNode, config);

}

svs.loadBoxImageFromId = async (id, name) => {
  if (!svs.progressBarMover) {
    svs.progressBar(true)
  }

  const downloadURL = await svs.getBoxDownloadURL(id)
  const previousHashParams = JSON.parse(window.localStorage.hashParams)
  previousHashParams.boxFileId = id
  previousHashParams.boxFilename = name
  window.localStorage.hashParams = JSON.stringify(previousHashParams)
  svs.modifyHashString({
    'boxFileId': id,
    'boxFilename': name,
    'fileURL': undefined
  })
  svs.loadImage(downloadURL)

  // if (url.substr(url.length - 4, 4) === "ndpi") {
  // 	alert("NDPI Images not yet supported!")
  // 	return
  // }
}

svs.loadImage = async (url) => {
  
  document.getElementById("imageURL").value = url
  if (url.length < 100) {
    svs.modifyHashString({
      'fileURL': url
    })
  }
  
  if (!svs.progressBarMover) {
    svs.progressBar(true)
  }

  const imageSWURL = `${svs.serverBasePath}/${encodeURIComponent(url)}`
  const infoURL = `${imageSWURL}/info.json`
  let imageInfo
  try {
    imageInfo = await (await fetch(infoURL)).json()
  } catch (e) {
    alert("An error occurred retrieving the image information. Please try again later.")
    console.log("An error occurred retrieving the image information. Please try again later.", e)
    svs.modifyHashString({
      'fileURL': undefined,
      'boxFileId': undefined,
      'boxFilename': undefined
    })
    svs.progressBar(false)
    // window.history.back()
    // setTimeout(() => {
    // 	document.getElementById("imageSelectName").value = hashParams.imageTag
    // 	document.getElementById("imageSelectId").value = hashParams.imageNslcId
    // }, 1000)
    // document.getElementById("loadingText").style.display = "none"
    return
  }
  console.log("Image Info : ", imageInfo)
  
  const tileSource = {
    "@context": imageInfo["@context"],
    "@id": imageSWURL,
    "width": parseInt(imageInfo.width),
    "height": parseInt(imageInfo.height),
    "profile": ["http://iiif.io/api/image/2/level2.json"],
    "protocol": "http://iiif.io/api/image",
    "tiles": [{
      "scaleFactors": [1, 4, 16, 64, 256, 1024],
      "width": 256
    }]
  }
  
  if (!svs.viewer) {
    svs.viewer = OpenSeadragon({
      id: "openseadragon",
      visibilityRatio: 1,
      minZoomImageRatio: 1,
      prefixUrl: "https://episphere.github.io/svs/openseadragon/images/",
      imageLoaderLimit: 5,
      timeout: 180*1000,
      tileSources: tileSource,
      crossOriginPolicy: "Anonymous",
      immediateRender: false
    })
    
    svs.viewer.addHandler('animation-finish', (e) => {
      const center = svs.viewer.viewport.getCenter()
      const zoom = roundToPrecision(svs.viewer.viewport.getZoom(), 3)

      if (center.x !== parseFloat(hashParams.wsiCenterX) || center.y !== parseFloat(hashParams.wsiCenterY) || zoom !== parseFloat(hashParams.wsiZoom)) {
        svs.modifyHashString({
          'wsiCenterX': center.x,
          'wsiCenterY': center.y,
          'wsiZoom': zoom
        }, true)
      }
    })

  } else {
    svs.removePanAndZoomFromHash()
    svs.viewer.open(tileSource)
  }

  svs.viewer.scalebar({
    type: OpenSeadragon.ScalebarType.MICROSCOPY,
    pixelsPerMeter: imageInfo.pixelsPerMeter,
    location: OpenSeadragon.ScalebarLocation.BOTTOM_LEFT
  })

  svs.viewer.addOnceHandler('open', () => {
    document.getElementById("wsiZoomSliderDiv")?.querySelectorAll("input")?.forEach(input => input.setAttribute("disabled", "true"))
    // svs.viewer.goHome()
    svs.viewer.world.getItemAt(0).addOnceHandler('fully-loaded-change', () => {
      svs.progressBar(false)
      // document.getElementById("loadingText").style.display = "none"
      let zoomSliderDiv = document.getElementById("wsiZoomSliderDiv")
      if (!zoomSliderDiv) {
        zoomSliderDiv = document.createElement("div")
        zoomSliderDiv.setAttribute("id", "wsiZoomSliderDiv")
        zoomSliderDiv.innerHTML = `
        <label><i class="bi bi-zoom-in"></i> &nbsp </label>
        <div style="width:100%;">
        <input id="wsiZoomSlider" type="range" min="1" max="40" value="${Math.min(40, svs.viewer?.viewport?.getZoom())}" oninput="svs.handleZoomSlider(this)" list="steplist" />
        <datalist id="steplist" style="--list-length: 9;">
            <option value="1">1X</option>
            <option value="5">5X</option>
            <option value="10">10X</option>
            <option value="15">15X</option>
            <option value="20">20X</option>
            <option value="25">25X</option>
            <option value="30">30X</option>
            <option value="35">35X</option>
            <option value="40">40X</option>
          </datalist>
          </div>
          <input id="wsiZoomSliderText" type="text" value="${roundToPrecision(svs.viewer.viewport.getZoom(), 3)}X" onfocus="this.value = this.value.slice(0, -1); this.setAttribute('type', 'number');" onfocusout="this.setAttribute('type', 'text'); this.value = this.value + 'X';" onchange="svs.handleZoomSlider(this)" disabled="true" />
        `
        document.getElementById("viewerParent").appendChild(zoomSliderDiv)
      }
      zoomSliderDiv.querySelectorAll("input").forEach(input => input.removeAttribute("disabled") )
      svs.handlePanAndZoom()
      svs.viewer.addHandler('zoom', () => {
        const zoomSlider = document.getElementById("wsiZoomSlider")
        const zoomSliderText = document.getElementById("wsiZoomSliderText")
        const currentZoomLevel = roundToPrecision(svs.viewer.viewport.getZoom(), 3)
        zoomSlider.value = Math.min(currentZoomLevel, parseFloat(zoomSlider.getAttribute("max")))
        zoomSliderText.value = currentZoomLevel
        if (zoomSliderText.getAttribute("type") === "text") {
          zoomSliderText.value += "X"
        }
      })
    })
  
  })
  // svs.viewer.addHandler("canvas-click", (e) => {
  //   e.preventDefaultAction = true
  //   const pos = svs.viewer.viewport.pointFromPixel(e.position)
  //   const tiledImage = svs.viewer.world.getItemAt(0)
  //   if (tiledImage) {
  //     const tilesClicked =  tiledImage.lastDrawn.filter((tile) => tile.bounds.containsPoint(pos))
  //     const smallestTileClicked = tilesClicked.reduce((minTile, tile) => tile.level > minTile.level ? tile : minTile, {level: 0})
  //     console.log(smallestTileClicked)
  //     const rect = document.createElement("div")
  //     rect.setAttribute("id", `${Math.floor(Math.random()*1000)}`)
  //     rect.setAttribute("class", "wsiAnnotation")
  //     svs.viewer.addOverlay({element: rect, location: smallestTileClicked.bounds})
  //     const newMetadata = JSON.parse(localStorage.fileMetadata)
  //     if (newMetadata["wsiAnnotation"]) {
  //       newMetadata["wsiAnnotation"].rects.push([smallestTileClicked.bounds.x, smallestTileClicked.bounds.y, smallestTileClicked.bounds.width, smallestTileClicked.bounds.height, smallestTileClicked.bounds.degree])
  //     }
  //     else {
  //       newMetadata["wsiAnnotation"] = {
  //         rects: [[smallestTileClicked.bounds.x, smallestTileClicked.bounds.y, smallestTileClicked.bounds.width, smallestTileClicked.bounds.height, smallestTileClicked.bounds.degree]]
  //       }
  //     }

  //     svs.updateMetadata(id, "wsiAnnotation", newMetadata["wsiAnnotation"])
  //   }
  // })
}

svs.getMetadata = async (id) => {
  const metadataAPI = `https://api.box.com/2.0/files/${id}/metadata/global/properties`
  let metadata = {}
  try {
    metadata = await fetch(metadataAPI, {
      method: "GET",
      headers: {
        'Authorization': `Bearer ${JSON.parse(localStorage.box).access_token}`
      }
    })
  } catch (e) {
    console.log(e)
    if (e.message === "404") {
      const metadataAPI = `https://api.box.com/2.0/files/${id}/metadata/global/properties`
      await fetch(metadataAPI, {
        'method': "POST",
        'headers': {
          'Content-Type': "application/json",
          'Authorization': `Bearer ${JSON.parse(localStorage.box).access_token}`
        }
      })
    }
  }
  return metadata.json()
}

svs.getBoxDownloadURL = async (id="732534427128") => {
  const metadata = await svs.getMetadata(id)
  localStorage.fileMetadata = JSON.stringify(metadata) || {}
  const ac = new AbortController()
  const signal = ac.signal
  const downloadFile = await fetch(`${boxBasePath}/files/${id}/content`, {headers: {"Authorization": `Bearer ${JSON.parse(localStorage.box).access_token}`}, signal})
  ac.abort()
  return downloadFile.url
}

svs.searchBoxByFilename = async (filename="") => {
  const defaultFields = ["id", "name"]
  const queryParams = `query=${filename}&type=file&content_types=name&fields=${defaultFields}`
  const searchEndpoint = `${boxBasePath}/search?${queryParams}`
  return fetch(searchEndpoint, {headers: {"Authorization": `Bearer ${JSON.parse(localStorage.box).access_token}`}})
}

svs.updateMetadata = async (id, path, updateData) => {
  // console.log(updateData)
  const updatePatch = [{
    'op': "add",
    path,
    'value': updateData
  }]
  let metadata = {}
  try {
    metadata = await fetch(`https://api.box.com/2.0/files/${id}/metadata/global/properties`, {
      'method': "PUT",
      'headers': {
        'Content-Type': "application/json-patch+json",
        'Authorization': `Bearer ${JSON.parse(localStorage.box).access_token}`
      },
      'body': JSON.stringify(updatePatch)
    })
  } catch (e) {
    if (e.message === "404") {
      const metadataAPI = `https://api.box.com/2.0/files/${id}/metadata/global/properties`
      const body = {}
      body[path] = updateData
      await fetch(metadataAPI, {
        'method': "POST",
        'headers': {
          'Content-Type': "application/json",
          'Authorization': `Bearer ${JSON.parse(localStorage.box).access_token}`
        },
        'body': JSON.stringify(body)
      })
    }
  }
  localStorage.fileMetadata = await metadata.json()
}

svs.filePicker = () => {
  const { FilePicker } = Box
  if (document.getElementById("filePickerContainer").childElementCount > 0) {
    document.getElementById("filePickerContainer").removeChild(document.getElementById("filePickerContainer")?.firstElementChild)
  }
  svs.boxFilePicker = new FilePicker({
    container: '#filePickerContainer'
  })
  svs.boxFilePicker.addListener('choose', async (item) => {
    // document.getElementById("loadingText").style.display = "block"
    // const boxOpenDownloadURL = await svs.getBoxDownloadURL(item[0].id)
    // svs.loadBoxImage(boxOpenDownloadURL, item[0].id)
    svs.progressBar(false)
    svs.loadBoxImageFromId(item[0].id, item[0].name)
  });
  svs.boxFilePicker.show("0", JSON.parse(localStorage.box).access_token, {
    container: '#filePickerContainer',
    maxSelectable: 1,
    extensions: ['svs', 'ndpi'],
    canSetShareAccess: false,
    canDelete: false,
    canCreateNewFolder: false,
    size: "small",
    chooseButtonLabel: "Select",
    cancelButtonLabel: "Cancel",
    logoUrl: "box"
  });
}

svs.loginSuccess = async () => {
  loadHashParams()
  document.getElementById("boxLoginBtn").style.display = "none";
  document.getElementById("welcomeMsg").style.display = "block";
  svs.filePicker()
}

svs.loadDefaultImage = async () => {
  const defaultWSIURL = "https://storage.googleapis.com/imagebox_test/Slide-0027830_Y561170_1002408.svs"
  document.getElementById("imageURL").value = defaultWSIURL
  svs.loadWSIFromURL()
}

svs.addServiceWorker = () => new Promise(resolve => {
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('./wsiServiceWorker.js')
		.then(async reg => {
      
      if (reg.active && !navigator.serviceWorker.controller) {
        // Handle hard reload case.
        await reg.unregister()
        await navigator.serviceWorker.register('./wsiServiceWorker.js')
      }
		  
      console.log('Registration succeeded. Scope is ' + reg.scope);
      resolve()
		
    }).catch((error) => {
		  console.log('Registration failed with ' + error);
      resolve()
		});
	}
})

svs.handlePanAndZoom = (centerX=hashParams?.wsiCenterX, centerY=hashParams?.wsiCenterY, zoomLevel=hashParams?.wsiZoom) => {
  if (svs.viewer?.viewport) {
    const currentZoom = svs.viewer.viewport.getZoom()
    zoomLevel = parseFloat(zoomLevel)
    if (zoomLevel && zoomLevel !== currentZoom) {
      svs.viewer.viewport.zoomTo(zoomLevel)
    }
    
    const { x: currentX, y: currentY } = svs.viewer.viewport.getCenter()
    centerX = parseFloat(centerX)
    centerY = parseFloat(centerY)
    if (centerX && centerY && ( centerX !== currentX || centerY !== currentY )) {
      svs.viewer.viewport.panTo(new OpenSeadragon.Point(centerX, centerY))
    }
  }
}

svs.removePanAndZoomFromHash = () => {
  svs.modifyHashString({
    'wsiCenterX': undefined,
    'wsiCenterY': undefined,
    'wsiZoom': undefined
  }, true)
}

svs.handleZoomSlider = (element) => {
  let zoomValue = parseFloat(element.value)
  if (zoomValue < svs.viewer.viewport.getMinZoom()) {
    zoomValue = svs.viewer.viewport.getMinZoom()
  } else if (zoomValue > svs.viewer.viewport.getMaxZoom()) {
    zoomValue = svs.viewer.viewport.getMaxZoom()
  }
  svs.handlePanAndZoom(undefined, undefined, zoomValue)
}

window.onload = async () => {
  await svs.addServiceWorker()
  loadHashParams()
  loadURLParams()
  if (await isLoggedIn()) {
    svs.loginSuccess()
  } else if (urlParams["code"]) {
    let replaceURLPath = window.location.host.includes("localhost") ? "/boxv2/" : "/svs/boxv2/"
    window.history.replaceState({}, "", `${replaceURLPath}`)
    try {
      await getAccessToken("authorization_code", urlParams["code"])
      svs.loginSuccess()
    } catch (err) {
      document.getElementById("boxLoginBtn").style = "display: block"
      console.log("ERROR LOGGING IN TO BOX!", err)
      return
    }
  } else {
    document.getElementById("boxLoginBtn").style = "display: block"
    return
  }
  if (!hashParams["fileURL"] && !hashParams["boxFileId"] && !hashParams["boxFilename"]) {
    svs.loadDefaultImage()
  }
}

window.onhashchange = loadHashParams