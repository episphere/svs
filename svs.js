svs={}

svs.saveFile=function(x,fileName) { // x is the content of the file
	var bb = new Blob([x]);
   	var url = URL.createObjectURL(bb);
	var a = document.createElement('a');
   	a.href=url;
	if (fileName){
		if(typeof(fileName)=="string"){ // otherwise this is just a boolean toggle or something of the sort
			a.download=fileName;
		}
		a.click() // then download it automatically 
	} 
	return a
}

svs.readCSV=async(url='HALO All Sherlock IDs 07282020_HP0493-001-007.csv')=>{
    let txt = await(await fetch(url)).text()
    return txt
}
svs.readJSON=async(url='HALO All Sherlock IDs 07282020_HP0493-001-007.json')=>{
    xx = await(await fetch(url)).json()
    return xx
}

//svs.readJSON()
svs.gcsBasePath = "https://storage.googleapis.com/imagebox_test"

svs.populateSelect = () => {
	const imagesInGCP = ["Slide-0027840_Y813170_1002418.svs","Slide-0027839_Y787170_1002417.svs","Slide-0027838_Y761170_1002416.svs","Slide-0027837_Y719170_1002415.svs","Slide-0027836_Y712170_1002414.svs","Slide-0027835_Y695170_1002413.svs","Slide-0027834_Y659170_1002412.svs","Slide-0027833_Y611170_1002411.svs","Slide-0027832_Y600170_1002410.svs","Slide-0027831_Y591170_1002409.svs","Slide-0027830_Y561170_1002408.svs","Slide-0027826_Y444170_1002404.svs","Slide-0027825_Y411170_1002403.svs","Slide-0027824_Y408170_1002402.svs","Slide-0027822_Y381170_1002420.svs","Slide-0027816_Y345170_1002394.svs","Slide-0027815_Y339170_1002393.svs","Slide-0027812_Y253170_1002390.svs","Slide-0027809_Y163170_1002387.svs","Slide-0027807_Y105170_1002385.svs","Slide-0027806_Y047170_1002384.svs","Slide-0027805_Y018170_1002383.svs","Slide-0027548_1068-CST00730-03.ndpi","Slide-0027549_1068-CTT-00774-03.ndpi","Slide-0027550_1113-CST-01973-03.ndpi","Slide-0027551_1113-CTT-01931-03.ndpi","Slide-0027552_1290-CST04544-03.ndpi","Slide-0027553_1290-CTT-04583-03.ndpi","Slide-0027554_1419-CST00193-04.ndpi","Slide-0027555_1419-CTT-00227-04.ndpi","Slide-0027556_1503-CST03145-04.ndpi","Slide-0027557_1503-CTT-03181-04.ndpi","Slide-0027560_1927-CST03766-05.ndpi","Slide-0027561_1927-CTT-02399-05.ndpi","Slide-0027562_2039-CST00887-06.ndpi","Slide-0027563_2039-CTT-00159-06.ndpi","Slide-0027564_2113-CST02172-06.ndpi","Slide-0027565_2113-CTT-00948-06.ndpi","Slide-0027566_2140-CST02179-06.ndpi","Slide-0027567_2140-CTT-02220-06.ndpi","Slide-0027568_2213-CST02644-12.ndpi","Slide-0027569_2213-CTT-00939-12.ndpi","Slide-0027570_2242-CST03557-06.ndpi","Slide-0027571_2242-CTT-03580-06.ndpi","Slide-0027572_2267-CST00574-07.ndpi","Slide-0027573_2267-CTT-00612-07.ndpi","Slide-0027574_2286-CST00580-07.ndpi","Slide-0027575_2286-CTT-00618-07.ndpi","Slide-0027576_2348-CST01697-07.ndpi","Slide-0027577_2348-CTT-01732-07.ndpi","Slide-0027578_2351-CST01700-07.ndpi","Slide-0027579_2351-CTT-01495-07.ndpi","Slide-0027580_2391-CST01719-07.ndpi","Slide-0027581_2391-CTT-01753-07.ndpi","Slide-0027582_2524-CST00182-08.ndpi","Slide-0027583_2524-CTT-00420-08.ndpi","Slide-0027584_2527-CST00185-08.ndpi","Slide-0027585_2527-CTT-00262-08.ndpi","Slide-0027586_2529-CST-00173-08-00413-08.ndpi","Slide-0027587_2529-CTT-00253-08.ndpi","Slide-0027588_2598-CST-00219-08-00451-08.ndpi","Slide-0027589_2598-CTT-00292-08.ndpi","Slide-0027592_2638-CST02004-08.ndpi","Slide-0027593_2638-CTT-00316-08.ndpi","Slide-0027598_2730-CST02568-08.ndpi","Slide-0027599_2730-CTT-02071-08.ndpi","Slide-0027600_2810-CST02596-08.ndpi","Slide-0027601_2810-CTT-02612-08.ndpi","Slide-0027602_2890-CST00454-09.ndpi","Slide-0027603_2890-CTT-00487-09.ndpi","Slide-0027604_2911-CST00464-09.ndpi","Slide-0027605_2911-CTT-00494-09.ndpi","Slide-0027606_3241-CST02670-09.ndpi","Slide-0027607_3241-CTT-00544-09.ndpi","Slide-0027610_3362-CST02716-09.ndpi","Slide-0027611_3362-CTT-04002-09.ndpi","Slide-0027612_3409-CST04260-09.ndpi","Slide-0027613_3409-CTT-04013-09.ndpi","Slide-0027614_3462-CST00735-10.ndpi","Slide-0027615_3462-CTT-00970-10.ndpi","Slide-0027618_3649-CST02809-10.ndpi","Slide-0027619_3649-CTT-00849-10.ndpi","Slide-0027620_3738-CST02840-10.ndpi","Slide-0027621_3738-CTT-02413-10.ndpi","Slide-0027628_3917-CST01427-10.ndpi","Slide-0027629_3917-CTT-04028-10.ndpi","Slide-0027630_3960-CST00650-11.ndpi","Slide-0027631_3960-CTT-00725-11.ndpi","Slide-0027638_4340-CST02954-11.ndpi","Slide-0027639_4340-CTT-02359-11.ndpi","Slide-0027640_4433-CST01270-11.ndpi","Slide-0027641_4433-CTT-02379-11.ndpi","Slide-0027652_4892-CST00969-12.ndpi","Slide-0027653_4892-CTT-02923-12.ndpi","Slide-0027654_4904-CST00975-12.ndpi","Slide-0027655_4904-CTT-01005-12.ndpi","Slide-0027658_494-CST-01374-04.ndpi","Slide-0027659_494-CTT-01316-04.ndpi","Slide-0027660_4968-CST00995-12.ndpi","Slide-0027661_4968-CTT-01016-12.ndpi","Slide-0027664_5071-CST00434-13.ndpi","Slide-0027665_5071-CTT-00496-13.ndpi","Slide-0027670_5204-CST03782-13.ndpi","Slide-0027671_5204-CTT-00539-13.ndpi","Slide-0027672_5253-CST04822-13.ndpi","Slide-0027673_5253-CTT-04945-13.ndpi","Slide-0027674_532-CST-01948-04.ndpi","Slide-0027675_532-CTT-01947-04.ndpi","Slide-0027676_5362-CST-04814-13-04938-13.ndpi","Slide-0027677_5362-CTT-04855-13-04938-13.ndpi","Slide-0027680_5575-CST00451-14.ndpi","Slide-0027681_5575-CTT-00512-14.ndpi","Slide-0027682_5607-CST00464-14.ndpi","Slide-0027683_5607-CTT-00682-14.ndpi","Slide-0027688_5751-CST02921-14.ndpi","Slide-0027689_5751-CTT-03202-14.ndpi","Slide-0027700_6077-CST04965-14.ndpi","Slide-0027701_6077-CTT-03270-14.ndpi","Slide-0027704_6297-CST00454-15.ndpi","Slide-0027705_6297-CTT-00687-15.ndpi","Slide-0027706_635-CST-02906-04.ndpi","Slide-0027707_635-CTT-02905-04.ndpi","Slide-0027708_6370-CST03203-15.ndpi","Slide-0027709_6370-CTT-00715-15.ndpi","Slide-0027714_6397-CST03219-15.ndpi","Slide-0027715_6397-CTT-03049-15.ndpi","Slide-0027716_6468-CST-03260-15-03087-15.ndpi","Slide-0027717_6468-CTT-00543-15-03087-15.ndpi","Slide-0027718_6494-CST-03271-15-03095-15.ndpi","Slide-0027719_6494-CTT-00551-15.ndpi","Slide-0027720_655-CST03423-04.ndpi","Slide-0027721_655-CTT-03426-04.ndpi","Slide-0027724_6657-CST05670-15.ndpi","Slide-0027725_6657-CTT-05814-15.ndpi","Slide-0027726_670-CST-03541-04.ndpi","Slide-0027727_670-CTT-03540-04.ndpi","Slide-0027734_6746-CST06280-15.ndpi","Slide-0027735_6746-CTT-05740-15.ndpi","Slide-0027736_6752-CST06285-15.ndpi","Slide-0027737_6752-CTT-01495-15.ndpi","Slide-0027738_6787-CST00014-16.ndpi","Slide-0027739_6787-CTT-00412-16.ndpi","Slide-0027740_6858-CST00048-16.ndpi","Slide-0027741_6858-CTT-00114-16.ndpi","Slide-0027744_7067-CST02608-16.ndpi","Slide-0027745_7124-CST03766-16.ndpi","Slide-0027746_7124-CTT-03706-16.ndpi","Slide-0027750_7181-CST03811-16.ndpi","Slide-0027751_7181-CTT-03742-16.ndpi","Slide-0027752_7188-CST03816-16.ndpi","Slide-0027753_7188-CTT-03877-16.ndpi","Slide-0027754_7234-CST04486-16.ndpi","Slide-0027755_727-CST-04121-04.ndpi","Slide-0027756_727-CTT-04120-04.ndpi","Slide-0027757_7307-CST01547-16.ndpi","Slide-0027758_7307-CTT-04609-16.ndpi","Slide-0027761_7416-CST00445-17.ndpi","Slide-0027762_7416-CTT-00352-17.ndpi","Slide-0027765_7464-CST02326-17.ndpi","Slide-0027766_7464-CTT-00545-17.ndpi","Slide-0027769_7573-CST02378-17.ndpi","Slide-0027770_7573-CTT-02723-17.ndpi","Slide-0027773_7624-CST03212-17.ndpi","Slide-0027774_7624-CTT-02744-17.ndpi","Slide-0027775_7628-CST03215-17.ndpi","Slide-0027776_7628-CTT-02746-17.ndpi","Slide-0027777_7633-CST03218-17.ndpi","Slide-0027778_7633-CTT-02747-17.ndpi","Slide-0027779_7640-CST03222-17.ndpi","Slide-0027780_7640-CTT-02748-17.ndpi","Slide-0027781_7678-CST03238-17.ndpi","Slide-0027782_7678-CTT-03298-17.ndpi","Slide-0027783_7695-CTT-03307-17.ndpi","Slide-0027785_7780-CTT-02798-17.ndpi","Slide-0027786_7780CST04192-17.ndpi","Slide-0027787_7859-CTT-04126-17.ndpi","Slide-0027788_7859CST04222-17.ndpi","Slide-0027795_7923-CST05067-17.ndpi","Slide-0027796_7923-CTT-04527-17.ndpi","Slide-0027799_7995-CST00401-18.ndpi","Slide-0027800_7995-CTT-00481-18.ndpi","Slide-0027801_821-CST05679-04.ndpi","Slide-0027802_821-CTT-05680-04.ndpi","Slide-0027803_843-CST-05990-04.ndpi","Slide-0027804_843-CTT-05993-04.ndpi","Slide-0310694_LH09-498 2B for LB09-0163.ndpi","Slide-0310695_LH09-498 2EXT for LB09-0163.ndpi","Slide-0310696_LH09-498 2F for LB09-0163.ndpi","Slide-0310697_LH09-498 2H for LB09-0163.ndpi","Slide-0310698_LH09.498 2C for LB09-0163.ndpi","Slide-0310699_LH09.498 2S for LB09-0163.ndpi","Slide-0310700_LH09.498 2T for LB09-0163.ndpi","Slide-0310701_LH12.481 2D1 for LB12-0084 .ndpi","Slide-0310702_LH12.481 2D2 for LB12-0084 .ndpi","Slide-0310703_LH12.481 2E for LB12-0084 .ndpi","Slide-0310704_LH14-3051 EXT for LB14-0512 .ndpi","Slide-0310705_LH14-3051 S for LB14-0512.ndpi","Slide-0310706_LH14-3051 T for LB14-0512.ndpi","Slide-0310707_LH14-3051 TLA for LB14-0512.ndpi","Slide-0310708_LH14-3051 TLB for LB14-0512.ndpi","Slide-0310709_LH14.1045 1A1 for LB14-0210 .ndpi","Slide-0310710_LH14.1045 1A2 (2) for LB14-0210 .ndpi","Slide-0310711_LH14.1045 1A2 AP MD for LB14-0210 .ndpi","Slide-0310712_LH14.1045 1A2 for LB14-0210 .ndpi","Slide-0310713_LH14.1045 1B for LB14-0210 .ndpi","Slide-0310714_LH14.1045 2A for LB14-0210 .ndpi","Slide-0310715_LH14.1045 2B for LB14-0210 .ndpi","Slide-0310716_LH14.2246 4C3 for LB14-0386 .ndpi","Slide-0310717_LH14.2246 4C4 for LB14-0386.ndpi","Slide-0310718_LH14.2246 4C5 for LB14-0386.ndpi","Slide-0310719_LH14.2246 4C7 for LB14-0386.ndpi","Slide-0310720_LH14.2246 4C8 for LB14-0386.ndpi","Slide-0310721_LH14.2246 4D1 for LB14-0386.ndpi","Slide-0310722_LH14.2246 4D3 for LB14-0386.ndpi","Slide-0310723_LH14.2246 4D4 for LB14-0386.ndpi","Slide-0310724_LH14.2246 4D5 for LB14-0386.ndpi","Slide-0310725_LH14.2246 4R1 for LB14-0386.ndpi","Slide-0310726_LH14.2246 4R10 for LB14-0386.ndpi","Slide-0310727_LH14.2246 4R2 for LB14-0386.ndpi","Slide-0310728_LH14.2246 4R3 for LB14-0386.ndpi","Slide-0310729_LH14.2246 4R6 for LB14-0386.ndpi","Slide-0310730_LH14.2246 4R7 for LB14-0386.ndpi","Slide-0310731_LH14.2246 4R8 for LB14-0386.ndpi","Slide-0310732_LH14.2246 4R9 for LB14-0386.ndpi"]
	const imageSelectElement = document.getElementById("imageSelect")
	imagesInGCP.forEach((image,idx) => {
		const optionElement = document.createElement("option")
		optionElement.value = `${svs.gcsBasePath}/${image}`
		optionElement.innerText = image
		imageSelectElement.appendChild(optionElement)
		if (idx === 0) {
			optionElement.setAttribute("selected", "selected")
			svs.showImage()
		}
		if (image.endsWith(".ndpi")) {
			optionElement.setAttribute("disabled", "true")
		}
	})
}

svs.showImage = async () => {
	document.getElementById("loadingText").style.display = "block"
	const urlInGCP = document.getElementById("imageSelect").value

	if (urlInGCP.substr(urlInGCP.length - 4, 4) === "ndpi") {
		alert("NDPI Images not yet supported!")
		return
	}

	const p = `https://dl-test-tma.uc.r.appspot.com/iiif/?iiif=${urlInGCP}`;
	const infoURL = `${p}/info.json`
	const imageInfo = await (await fetch(infoURL)).json()
	console.log("image Info : ", imageInfo)
	const infoTable = document.getElementById("infoTable")
	infoTable.innerHTML = ""
	infoTable.style.width = '20%'
	infoTable.style.border = "1px solid black"
	infoTable.style.textAlign = "center"
	document.getElementById("imageInfo").appendChild(infoTable)
	Object.entries(imageInfo).forEach(([key, val]) => {
		if (!key.trim().startsWith("@")) {
			key = key.slice(0,1).toUpperCase() + key.slice(1)
			infoTable.innerHTML += `<tr><td>\n${key}</td><td>${val}</td></tr>`
		}
	})
	infoTable.querySelectorAll("tr").forEach(el => {
		el.style.border = "1px solid black"

		el.querySelectorAll("td").forEach(el2 => el2.style.border = "1px solid black")
	})
	const viewer1 = OpenSeadragon({
		id: "openseadragon1",
		preserveViewport: true,
		visibilityRatio:    1,
		minZoomLevel:       1,
		defaultZoomLevel:   1,
		prefixUrl: "/openseadragon/images/",
		tileSources: {
			"@context": imageInfo["@context"],
			"@id": p,
			"height": parseInt(imageInfo.height),
			"width": parseInt(imageInfo.width),
			"profile": [ "http://iiif.io/api/image/2/level2.json" ],
			"protocol": "http://iiif.io/api/image",
			"tiles": [{
				"scaleFactors": [ 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576],
				"width": 256
			}]
		}
	});
	setTimeout(() => document.getElementById("loadingText").style.display = "none", 2000)
}

if(typeof(define)!='undefined'){
	define(svs)
}

window.onload = () => svs.populateSelect()