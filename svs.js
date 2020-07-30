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

svs.readJSON()


if(typeof(define)!='undefined'){
    define(svs)
}