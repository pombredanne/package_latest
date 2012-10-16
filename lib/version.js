var http = require('http');
var async = require('async');
var fs = require('fs');

function readPackage(callback){
	fs.exists('./package.json', function(exists){
		if(exists){
			fs.readFile('./package.json', function(err, data){
				if(err){
					console.log('An error occured in reading package.json');
				}else{
					callback(data);
				}
			});
		}else{
			console.log('package.json not found in the current directory.')
		}
	});
}

function processDependencies(packageJSON){
	var series = [],
		packageDetails = JSON.parse(packageJSON),
		dependencies = packageDetails.dependencies;

	for(var index in dependencies){
		series.push(genRegisteryRequest(index));
	}

	async.series(series, function(err, latestModuleDefinitions){
		if(err){
			console.log('An error occured with async: ' + err);
		}else{
			writePackage(packageDetails, latestModuleDefinitions);
		}
	});
}

function genRegisteryRequest(moduleName){
	return function(callback){
		http.get('http://registry.npmjs.org/' + moduleName + '/latest', function(res){
			var result = '';

			res.setEncoding('utf8');
			res.on('data', function(chunk){
				result += chunk;
			});

			res.on('end', function(){
				callback(null, JSON.parse(result));
			});;
		});
	};
}

function writePackage(packageDetails, latestModuleDefinitions){
	writePackageHistory(packageDetails, function(){
		writePackageUpdate(packageDetails, latestModuleDefinitions);
	});
}

function writePackageHistory(packageDetails, callback){
	var historyName = 'package-' + getISODate() + '.json',
		historyDirectory = 'package_history';

	//create history directory if doesn't exist
	fs.exists(historyDirectory, function(exists){
		if(!exists){
			fs.mkdir(historyDirectory, function(err){
				if(err){
					console.log(err);
				}else{
					writeHistoryFile(historyDirectory, historyName, packageDetails, callback);
				}
			});
		}else{
			writeHistoryFile(historyDirectory, historyName, packageDetails, callback);
		}
	});
}

function writeHistoryFile(historyDirectory, historyName, packageDetails, callback){
	var filePath = historyDirectory + '/' + historyName;

	fs.writeFile(filePath, JSON.stringify(packageDetails, null, 4), function(err){
		if(err){
			console.log(err);
		}else{
			console.log('Wrote original package to:' + filePath);
			callback();
		}
	});
}
	
function getISODate(){
	return (new Date()).toISOString().substring(0, 10);
}

function writePackageUpdate(packageDetails, latestModuleDefinitions){
	var len = latestModuleDefinitions.length,
		module,
		name,
		version;

	for(var i = 0; i < len; i++){
		module = latestModuleDefinitions[i];
		name = module.name;
		version = module.version;

		packageDetails.dependencies[name] = version;
	}

	fs.writeFile('package.json', JSON.stringify(packageDetails, null, 4), function (err) {
	  if (err){
	  	console.log('Error writing package.json: ' + err);
	  }else{
	  	console.log('Wrote updated package to package.json');
	  }
	});
}

//point of entry
exports.updatePackage = function(){
	readPackage(processDependencies)
};

