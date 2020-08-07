svs = {}

const client_id = window.location.host.includes("localhost") ? "52zad6jrv5v52mn1hfy1vsjtr9jn5o1w" : "1n44fu5yu1l547f2n2fgcw7vhps7kvuw"
const client_secret = window.location.host.includes("localhost") ? "2rHTqzJumz8s9bAjmKMV83WHX1ooN4kT" : "2ZYzmHXGyzBcjZ9d1Ttsc1d258LiGGVd"
const state = "sALTfOrSEcUrITy"
const redirect_uri = window.location.host.includes("localhost") ? "http://localhost:8081/box" : "https://episphere.github.io/svs/box"

const boxAuthEndpoint = encodeURI(`https://account.box.com/api/oauth2/authorize?response_type=code&client_id=${client_id}&state=${state}&redirect_uri=${redirect_uri}`)
const boxAccessTokenEndpoint = "https://api.box.com/oauth2/token"
const boxAppBasePath = "https://nih.app.box.com"
const boxBasePath = "https://api.box.com/2.0"


const urlParams = {}
svs.loadURLParams = () => {
  window.location.search.slice(1).split('&').forEach(param => {
    const [key, value] = param.split('=')
    urlParams[key] = value
  })
}

const isLoggedIn = async () => {
  // console.log(window.localStorage.box)
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
  // storeCredsToIndexedDB(newCreds)
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

svs.gcsBasePath = "https://storage.googleapis.com/imagebox_test"
// svs.serverBasePath = "https://dl-test-tma.uc.r.appspot.com/iiif"
svs.serverBasePath = "http://localhost:8080/iiif"

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
  if (hashParams.imageTag && svs.validImageNames.includes(hashParams.imageTag)) {
    const correspondingObject = svs.imageNameToIdMapping.find(x => x.ImageTag === hashParams.imageTag)
    if (!hashParams.imageNslcId) {
      window.location.hash += `&imageNslcId=${correspondingObject["NSLC ID"]}`
      return
    } else if (hashParams.imageNslcId && hashParams.imageNslcId !== correspondingObject["NSLC ID"]) {
      window.location.hash = window.location.hash.replace(`imageNslcId=${hashParams.imageNslcId}`, `imageNslcId=${correspondingObject["NSLC ID"]}`)
      return
    } else {
      svs.loadImage(`${svs.gcsBasePath}/${hashParams.imageTag}`)
      document.getElementById("imageId").innerText = correspondingObject["NSLC ID"]
    }
  } else if (hashParams.imageNslcId && svs.validImageIDs.includes(hashParams.imageNslcId)) {
    const correspondingObject = svs.imageNameToIdMapping.find(x => x["NSLC ID"] === hashParams.imageNslcId)
    if (!hashParams.imageTag) {
      window.location.hash += `&imageTag=${correspondingObject.ImageTag}`
      return
    } else if (hashParams.imageTag && hashParams.imageTag !== correspondingObject.ImageTag) {
      window.location.hash = window.location.hash.replace(`imageTag=${hashParams.imageTag}`, `imageTag=${correspondingObject.ImageTag}`)
      return
    } else {
      svs.loadImage(`${svs.gcsBasePath}/${correspondingObject.imageTag}`)
      document.getElementById("imageId").innerText = correspondingObject["NSLC ID"]
    }
  }
}

svs.populateSelects = () => {
  const imageSelectNameElement = document.getElementById("imageSelectName")
  const imageSelectIdElement = document.getElementById("imageSelectId")
  imageSelectNameElement.innerHTML = ""
  imageSelectIdElement.innerHTML = ""
  svs.validImageNames.forEach((image, idx) => {
    const correspondingObject = svs.imageNameToIdMapping.find(x => x.ImageTag === image)
    const nameOptionElement = document.createElement("option")
    const idOptionElement = document.createElement("option")

    nameOptionElement.value = encodeURIComponent(image)
    nameOptionElement.innerText = image
    idOptionElement.value = correspondingObject["NSLC ID"]
    idOptionElement.innerText = correspondingObject["NSLC ID"]

    nameOptionElement.setAttribute("nslcId", correspondingObject["NSLC ID"])
    nameOptionElement.setAttribute("imageTag", image)
    idOptionElement.setAttribute("nslcId", correspondingObject["NSLC ID"])
    idOptionElement.setAttribute("imageTag", image)

    imageSelectNameElement.appendChild(nameOptionElement)
    imageSelectIdElement.appendChild(idOptionElement)

    if (idx === 0 && !hashParams.imageTag) {
      nameOptionElement.setAttribute("selected", "selected")
      idOptionElement.setAttribute("selected", "selected")
      svs.selectImageByName(image)
    } else if (hashParams.imageTag && hashParams.imageTag === image) {
      nameOptionElement.setAttribute("selected", "selected")
      idOptionElement.setAttribute("selected", "selected")
    }
    // if (image.endsWith(".ndpi")) {
    // 	nameOptionElement.setAttribute("disabled", "true")
    // 	idOptionElement.setAttribute("disabled", "true")
    // }
  })


}

svs.selectImageByName = () => {
  document.getElementById("loadingText").style.display = "block"
  const image = document.getElementById("imageSelectName").value
  const correspondingObject = svs.imageNameToIdMapping.find(x => x.ImageTag === decodeURIComponent(image))
  document.getElementById("imageSelectId").value = correspondingObject["NSLC ID"]
  window.location.hash = `imageTag=${image}&imageNslcId=${correspondingObject["NSLC ID"]}`
  document.getElementById("openseadragon1").setAttribute("imageTag", correspondingObject.ImageTag)
  document.getElementById("openseadragon1").setAttribute("imageNslcId", correspondingObject["NSLC ID"])
}

svs.selectImageById = () => {
  document.getElementById("loadingText").style.display = "block"
  const image = document.getElementById("imageSelectId").value
  const correspondingObject = svs.imageNameToIdMapping.find(x => x["NSLC ID"] === image)
  document.getElementById("imageSelectName").value = encodeURIComponent(correspondingObject.ImageTag)
  window.location.hash = `imageTag=${correspondingObject.ImageTag}&imageNslcId=${image}`
  document.getElementById("openseadragon1").setAttribute("imageTag", correspondingObject.ImageTag)
  document.getElementById("openseadragon1").setAttribute("imageNslcId", correspondingObject["NSLC ID"])
}

svs.loadFromURL = () => document.getElementById("imageURL").value.length > 0 ? svs.loadImage(document.getElementById("imageURL").value) : {}

svs.loadImage = async (urlInGCP) => {

  // if (urlInGCP.substr(urlInGCP.length - 4, 4) === "ndpi") {
  // 	alert("NDPI Images not yet supported!")
  // 	return
  // }

  const p = `${svs.serverBasePath}/?iiif=${urlInGCP}`;
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

  // const infoTable = document.getElementById("infoTable")
  // infoTable.innerHTML = ""
  // infoTable.style.width = '20%'
  // infoTable.style.border = "1px solid black"
  // infoTable.style.textAlign = "center"
  // document.getElementById("imageInfo").appendChild(infoTable)
  // Object.entries(imageInfo).forEach(([key, val]) => {
  // 	if (!key.trim().startsWith("@")) {
  // 		key = key.slice(0, 1).toUpperCase() + key.slice(1)
  // 		infoTable.innerHTML += `<tr><td>\n${key}</td><td>${val}</td></tr>`
  // 	}
  // })
  // infoTable.querySelectorAll("tr").forEach(el => {
  // 	el.style.border = "1px solid black"

  // 	el.querySelectorAll("td").forEach(el2 => el2.style.border = "1px solid black")
  // })

  document.getElementById("openseadragon").innerHTML = ""
  const viewer1 = OpenSeadragon({
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
}

svs.getDownloadURL = async (id) => {
  const ac = new AbortController()
  const signal = ac.signal
  const downloadFile = await fetch(`${boxBasePath}/files/${id}/content`, {headers: {"Authorization": `Bearer ${JSON.parse(localStorage.box).access_token}`}, signal})
  ac.abort()
  return downloadFile.url
}

if (typeof (define) != 'undefined') {
  define(svs)
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
    svs.loadImage(boxOpenDownloadURL)
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

svs.loginSuccess = () => {
  document.getElementById("boxLoginBtn").style.display = "none";
  document.getElementById("welcomeMsg").style.display = "block";
  svs.filePicker()
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
  // svs.imageNameToIdMapping = await resp.json()
  // svs.validImageNames = svs.imageNameToIdMapping.map(x => x.ImageTag).sort((a, b) => b.endsWith(".svs") ? 1 : -1)
  // svs.validImageIDs = svs.imageNameToIdMapping.map(x => x["NSLC ID"])
  // svs.loadHashParams()
  // svs.populateSelects()
}

window.onhashchange = svs.loadHashParams