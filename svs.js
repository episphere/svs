svs = {}

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
// svs.serverBasePath = "https://imageboxv2-oxxe7c4jbq-uc.a.run.app/iiif"
// svs.serverBasePath = "http://localhost:8080/iiif"

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

svs.loadImage = async (urlInGCP) => {

  // if (urlInGCP.substr(urlInGCP.length - 4, 4) === "ndpi") {
  // 	alert("NDPI Images not yet supported!")
  // 	return
  // }
  urlInGCP = urlInGCP.replace(/\s/g, "_")
  // const format = urlInGCP.endsWith(".ndpi") ? "ndpi" : "svs"
  // const p = `${svs.serverBasePath}/?iiif=${urlInGCP}`;
  // const infoURL = `${p}/info.json`
  // let imageInfo
  // try {
  //   imageInfo = await (await fetch(infoURL)).json()
  // } catch (e) {
  //   alert("An error occurred retrieving the image information. Please try again later.")
  //   // window.history.back()
  //   // setTimeout(() => {
  //   // 	document.getElementById("imageSelectName").value = hashParams.imageTag
  //   // 	document.getElementById("imageSelectId").value = hashParams.imageNslcId
  //   // }, 1000)
  //   document.getElementById("loadingText").style.display = "none"
  //   return
  // }
  // console.log("image Info : ", imageInfo)

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

  document.getElementById("openseadragon1").innerHTML = ""
  const tileSources = await OpenSeadragon.GeoTIFFTileSource.getAllTileSources(urlInGCP, { logLatency: false, cache: true, slideOnly: true })
  console.log(tileSources)
  const viewer1 = OpenSeadragon({
    id: "openseadragon1",
    visibilityRatio: 1,
    minZoomImageRatio: 1,
    prefixUrl: "https://episphere.github.io/svs/openseadragon/images/",
    imageLoaderLimit: 5,
    timeout: 1000 * 1000,
    crossOriginPolicy: "Anonymous",
    tileSources: await OpenSeadragon.GeoTIFFTileSource.getAllTileSources(urlInGCP, { logLatency: false, cache: true, slideOnly: true })
  });
  setTimeout(() => document.getElementById("loadingText").style.display = "none", 5000)
}

if (typeof (define) != 'undefined') {
  define(svs)
}
window.onload = () => fetch(`${window.location.origin}${window.location.pathname}mapping.json`).then(async resp => {
  svs.imageNameToIdMapping = await resp.json()
  svs.validImageNames = svs.imageNameToIdMapping.map(x => x.ImageTag).sort((a, b) => b.endsWith(".svs") ? 1 : -1)
  svs.validImageIDs = svs.imageNameToIdMapping.map(x => x["NSLC ID"])
  svs.loadHashParams()
  svs.populateSelects()
})
window.onhashchange = svs.loadHashParams