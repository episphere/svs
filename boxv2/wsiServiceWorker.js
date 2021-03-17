importScripts("./geotiff.js")

self.oninstall = () => {
    self.skipWaiting()
}

self.onactivate = () => {
    self.clients.claim()
}

const tileServerBasePath = location.host.includes("localhost") ? "http://localhost:8000/iiif" : "https://episphere.github.io/svs/boxv2/iiif"
const imageInfoContext = "https://iiif.io/api/image/2/context.json"
let tiff = {}
let image = {}
// let pool = new GeoTIFF.Pool(Math.floor(navigator.hardwareConcurrency/2))

const getImageInfo = async (url) => {
    const imageURL = url.split("?iiif=")[1].split("/info.json")[0]
    await getImages(imageURL, true)
    const response = new Response(JSON.stringify({
        'width': image[imageURL][0].getWidth(),
        'height': image[imageURL][0].getHeight(),
        '@context': imageInfoContext
    }), {
        status: 200
    })
    return response
}

const getImages = (imageURL, firstOnly=false) => new Promise (async (resolve, reject) => {
    image[imageURL] = image[imageURL] || []
    try {
        tiff[imageURL] = tiff[imageURL] || await GeoTIFF.fromUrl(imageURL)
        const imageCount = await tiff[imageURL].getImageCount()
        if (image[imageURL].length !== imageCount) {
            image[imageURL] = []
            for (let i=0; i<imageCount-2; i++) {
                const imageAtIndex = await tiff[imageURL].getImage(i)
                image[imageURL].push(imageAtIndex)
                if (firstOnly) {
                    resolve()
                }
            }
            if (!firstOnly) {
                resolve()
            }
            return
        }
    } catch (e) {
        console.log("Couldn't get images", e)
        reject(e)
    }
})

const getImageIndexByRatio = (imageURL, tileWidthRatio) => {
    const imageWidthRatios = image[imageURL].map(img => Math.floor(image[imageURL][0].getWidth()/img.getWidth()))
    const sortedRatios = [...imageWidthRatios].sort((a,b) => a - b).slice(0, -1) // Remove thumbnail from consideration
    if (tileWidthRatio > 8) {
        return imageWidthRatios.indexOf(sortedRatios[sortedRatios.length - 1])
    } else if (tileWidthRatio <=2 && tileWidthRatio > 0) {
        return 0 // Return first image for high magnification tiles
    } else {
        if (sortedRatios.length === 3) {
            return imageWidthRatios.indexOf(sortedRatios[sortedRatios.length - 2])
        } else if (sortedRatios.length > 3) {
            if (tileWidthRatio > 4) {
                return imageWidthRatios.indexOf(sortedRatios[sortedRatios.length - 2])
            } else {
                return imageWidthRatios.indexOf(sortedRatios[sortedRatios.length - 3])
            }
        }
    }
}

const getImageTile = async (url) => {
    const imageTileParams = url.split("?iiif=")[1].split("/0/default.jpg")[0].split("/")
    const tileWidthForRendering = parseInt(imageTileParams.pop().slice(0, -1)) || 256
    const ltwh = imageTileParams.pop().split(",")
    const tileWidthInImage = parseInt(ltwh[2])
    const tileHeightInImage = parseInt(ltwh[3])
    const imageURL = imageTileParams.join("/")
    if (!image[imageURL] || !Array.isArray(image[imageURL]) || image[imageURL].length === 0) {
        await getImages(imageURL, false)
    }
    
    const tileWidthRatio = Math.floor(tileWidthInImage/tileWidthForRendering)
    const bestImageIndex = getImageIndexByRatio(imageURL, tileWidthRatio)
    // console.log("BEST INDEX", tileWidthForRendering, ltwh, bestImageIndex, "\n")

    const bestImageWidth = image[imageURL][bestImageIndex].getWidth()
    const bestImageHeight = image[imageURL][bestImageIndex].getHeight()
    const tileHeightForRendering = Math.floor(tileWidthForRendering * bestImageHeight/bestImageWidth)

    const tileInImageLeftCoord = Math.floor(parseInt(ltwh[0]) * bestImageWidth/image[imageURL][0].getWidth())
    const tileInImageTopCoord = Math.floor(parseInt(ltwh[1]) * bestImageHeight/image[imageURL][0].getHeight())
    const tileInImageRightCoord = Math.floor((parseInt(ltwh[0]) + tileWidthInImage) * bestImageWidth/image[imageURL][0].getWidth())
    const tileInImageBottomCoord = Math.floor((parseInt(ltwh[1]) + tileHeightInImage) * bestImageHeight/image[imageURL][0].getHeight())
    // console.log("CALCULATED CO-ORDS:", tileInImageLeftCoord, tileInImageTopCoord, tileInImageRightCoord, tileInImageBottomCoord, "\n")
    // debugger
    // console.time('Best Image')
    let data = await image[imageURL][bestImageIndex].readRasters({width: tileWidthForRendering, height: tileHeightForRendering, window:[tileInImageLeftCoord, tileInImageTopCoord, tileInImageRightCoord, tileInImageBottomCoord] })
    // console.timeEnd('Best Image')
    
    let imageData = []
    data[0].forEach((val, ind) => {
        imageData.push(val)
        imageData.push(data[1][ind])
        imageData.push(data[2][ind])
        imageData.push(255)
    })

    const cv = new OffscreenCanvas(tileWidthForRendering, tileHeightForRendering)
    const ctx = cv.getContext('2d')
    ctx.putImageData(new ImageData(Uint8ClampedArray.from(imageData), tileWidthForRendering, tileHeightForRendering), 0, 0)
    const blob = await cv.convertToBlob({
        type: "image/jpeg",
        quality: 1.0
    })
    
    const response = new Response(blob, {status: 200})
    // console.log(response)
    return response
}

self.addEventListener("fetch", (e) => {
    if (e.request.url.startsWith(tileServerBasePath)) {
        if (e.request.url.endsWith("/info.json")) {
            e.respondWith(getImageInfo(e.request.url))
            return
        } else if (e.request.url.includes("download/full/")) {
            e.respondWith(new Response(JSON.stringify({}), {status: 404}))
        } else if (e.request.url.endsWith("/default.jpg")) {
            e.respondWith(getImageTile(e.request.url))
        }
    }
})