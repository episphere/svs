svs = {}
window.location.href = "/boxv2"

const client_id = window.location.host.includes("localhost") ? "52zad6jrv5v52mn1hfy1vsjtr9jn5o1w" : "1n44fu5yu1l547f2n2fgcw7vhps7kvuw"
const client_secret = window.location.host.includes("localhost") ? "2rHTqzJumz8s9bAjmKMV83WHX1ooN4kT" : "2ZYzmHXGyzBcjZ9d1Ttsc1d258LiGGVd"
const state = "sALTfOrSEcUrITy"
const redirect_uri = window.location.host.includes("localhost") ? "http://localhost:8000/box" : "https://episphere.github.io/svs/box"

const boxAuthEndpoint = encodeURI(`https://account.box.com/api/oauth2/authorize?response_type=code&client_id=${client_id}&state=${state}&redirect_uri=${redirect_uri}`)
const boxAccessTokenEndpoint = "https://api.box.com/oauth2/token"
const boxAppBasePath = "https://nih.app.box.com"
const boxBasePath = "https://api.box.com/2.0"

svs.gcsBasePath = "https://storage.googleapis.com/imagebox_test"
// svs.serverBasePath = "https://dl-test-tma.uc.r.appspot.com/iiif"
// svs.serverBasePath = "https://imagebox-cloudrun-test-oxxe7c4jbq-uc.a.run.app/iiif"
// svs.serverBasePath = "http://localhost:8080/iiif"

const urlParams = {}
svs.loadURLParams = () => {
  window.location.search.slice(1).split('&').forEach(param => {
    const [key, value] = param.split('=')
    urlParams[key] = value
  })
}

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
}

svs.saveFile = function (x, fileName) { // x is the content of the file
  var bb = new Blob([x]);
  var url = URL.createObjectURL(bb);
  var a = document.createElement('a');
  a.href = url;
  if (fileName) {
    if (typeof (fileName) == "string") { // otherwise this is just a boolean toggle or something of the sort
      a.download = fileName;
    }
    a.click() // then download it automatically 
  }
  return a
}

svs.readCSV = async (url = 'HALO All Sherlock IDs 07282020_HP0493-001-007.csv') => {
  let txt = await (await fetch(url)).text()
  return txt
}
svs.readJSON = async (url = 'HALO All Sherlock IDs 07282020_HP0493-001-007.json') => {
  xx = await (await fetch(url)).json()
  return xx
}


svs.loadHashParams = async () => {
  hashParams = {}
  if (window.location.hash.includes("=")) {
    window.location.hash.slice(1).split('&').forEach(param => {
      let [key, value] = param.split('=')
      value = value.replace(/['"]+/g, "") // for when the hash parameter contains quotes.
      value = decodeURIComponent(value)
      hashParams[key] = value
    })
  }
}

svs.loadFromURL = () => document.getElementById("imageURL").value.length > 0 ? svs.loadImage(document.getElementById("imageURL").value) : {}

svs.loadImage = async (url, id="710606247714") => {

  // if (url.substr(url.length - 4, 4) === "ndpi") {
  // 	alert("NDPI Images not yet supported!")
  // 	return
  // }

  const p = `${svs.serverBasePath}/?iiif=${url}`;
  const infoURL = `${p}/info.json`
  let imageInfo
  try {
    imageInfo = await (await fetch(infoURL)).json()
  } catch (e) {
    alert("An error occurred retrieving the image information. Please try again later.")
    // window.history.back()
    // setTimeout(() => {
    // 	document.getElementById("imageSelectName").value = hashParams.imageTag
    // 	document.getElementById("imageSelectId").value = hashParams.imageNslcId
    // }, 1000)
    document.getElementById("loadingText").style.display = "none"
    return
  }
  console.log("image Info : ", imageInfo)

  document.getElementById("openseadragon").innerHTML = ""
  viewer1 = OpenSeadragon({
    id: "openseadragon",
    preserveViewport: true,
    visibilityRatio: 1,
    minZoomLevel: 1,
    defaultZoomLevel: 1,
    prefixUrl: "/openseadragon/images/",
    tileSources: {
      "@context": imageInfo["@context"],
      "@id": p,
      "height": parseInt(imageInfo.height),
      "width": parseInt(imageInfo.width),
      "profile": ["http://iiif.io/api/image/2/level2.json"],
      "protocol": "http://iiif.io/api/image",
      "tiles": [{
        "scaleFactors": [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576],
        "width": 256
      }]
    }
  });
  setTimeout(() => document.getElementById("loadingText").style.display = "none", 5000)
  viewer1.addHandler("canvas-click", (e) => {
    e.preventDefaultAction = true
    const pos = viewer1.viewport.pointFromPixel(e.position)
    const tiledImage = viewer1.world.getItemAt(0)
    if (tiledImage) {
      const tilesClicked =  tiledImage.lastDrawn.filter((tile) => tile.bounds.containsPoint(pos))
      const smallestTileClicked = tilesClicked.reduce((minTile, tile) => tile.level > minTile.level ? tile : minTile, {level: 0})
      console.log(smallestTileClicked)
      const rect = document.createElement("div")
      rect.setAttribute("id", `${Math.floor(Math.random()*1000)}`)
      rect.setAttribute("class", "wsiAnnotation")
      viewer1.addOverlay({element: rect, location: smallestTileClicked.bounds})
      const newMetadata = JSON.parse(localStorage.fileMetadata)
      if (newMetadata["wsiAnnotation"]) {
        newMetadata["wsiAnnotation"].rects.push([smallestTileClicked.bounds.x, smallestTileClicked.bounds.y, smallestTileClicked.bounds.width, smallestTileClicked.bounds.height, smallestTileClicked.bounds.degree])
      }
      else {
        newMetadata["wsiAnnotation"] = {
          rects: [[smallestTileClicked.bounds.x, smallestTileClicked.bounds.y, smallestTileClicked.bounds.width, smallestTileClicked.bounds.height, smallestTileClicked.bounds.degree]]
        }
      }

      svs.updateMetadata(id, "wsiAnnotation", newMetadata["wsiAnnotation"])
    }
  })
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

svs.getDownloadURL = async (id="710606247714") => {
  const metadata = await svs.getMetadata(id)
  localStorage.fileMetadata = JSON.stringify(metadata) || {}
  const ac = new AbortController()
  const signal = ac.signal
  const downloadFile = await fetch(`${boxBasePath}/files/${id}/content`, {headers: {"Authorization": `Bearer ${JSON.parse(localStorage.box).access_token}`}, signal})
  ac.abort()
  return downloadFile.url
}

if (typeof (define) != 'undefined') {
  define(svs)
}

svs.updateMetadata = async (id, path, updateData) => {
  console.log(updateData)
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
  const filePicker = new FilePicker({
      container: '#filePickerButton'
  })
  document.getElementById("filePickerContainer").style.height = document.getElementById("openseadragon").getBoundingClientRect().height
  filePicker.addListener('choose', async (item) => {
    document.getElementById("loadingText").style.display = "block"
    const boxOpenDownloadURL = await svs.getDownloadURL(item[0].id)
    svs.loadImage(boxOpenDownloadURL, item[0].id)
  });
  filePicker.show("0", JSON.parse(localStorage.box).access_token, {
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
  document.getElementById("boxLoginBtn").style.display = "none";
  document.getElementById("welcomeMsg").style.display = "block";
  svs.filePicker()
  const url = await svs.getDownloadURL()
  svs.loadImage(url)
}


window.onload = async () => {
  svs.loadURLParams()
  if (await isLoggedIn()) {
    svs.loginSuccess()
  } else if (urlParams["code"]) {
    let replaceURLPath = window.location.host.includes("localhost") ? "/box" : "/svs/box"
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
}

window.onhashchange = svs.loadHashParams