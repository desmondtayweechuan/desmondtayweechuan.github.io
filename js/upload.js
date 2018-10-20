// TODO: Show error message to user when upload fail
document.querySelector('[name="file-select"]').addEventListener('change', handleFileUploadChange);
document.querySelector('[name="file-upload"]').addEventListener('click', handleFileUploadSubmit);

var count = 0;
var uid = "0JyGKtIcPFcdVdybLwdVpiqZBvi1";
var tagsArr = [];
var batchName = "";
var description = "";
var tags = "";
var avail = "";

var batchKey = "";

// Get user uid for folder creation in storage
// firebase.auth().onAuthStateChanged(user => {
//     if (user) {
// 		uid = user.uid;
// 	} else {
// 		console.log("user is null");
// 	}
// });

// When user selects file, load it to array
var imagesArr = [];
function handleFileUploadChange(e) {
	for (var i = 0; i < e.target.files.length; i++) {
		imagesArr[i] = e.target.files[i];
	}
}

// When user selects upload, perform upload
function handleFileUploadSubmit(e) {
	batchKey = firebase.database().ref().push().key;
	batchName = document.getElementById('batchName').value;
	description = document.getElementById('description').value;
	tags = document.getElementById('tags').value;
	var radios = document.getElementsByName('radios');

	for (var i = 0, length = radios.length; i < length; i++)
	{
		if (radios[i].checked)
		{
			avail = radios[i].value;

			// only one radio can be logically checked, don't check the rest
			break;
		}
	}

	// If user entered tags, it can only have alphabets or numbers and no spacing
	var tagsCheck = true;
	if (tags !== "") {
		tagsArr = tags.split(",");

		for (var i = 0; i < tagsArr.length; i++) {
			// If tags does not match the alphanumeric check, then reject the user input
			if (!isAlphaNumeric(tagsArr[i])) {
				tagsCheck = false;
				break;
			}
		}
	} else {
		tagsCheck = false;
	}

	if (batchName == "") {
		window.alert("Please enter a batch name!");

	} else if (!isAlphaNumeric(batchName)) {
		window.alert("Please only enter alphabets and numbers for batch name!");
		document.getElementById("batchName").value = "";

	} else if (!tagsCheck) {
		window.alert("Please ensure tags only have alphabets or numbers, no spacing is allowed.");
		document.getElementById("tags").value = "";

	} else if (imagesArr.length == 0) {
		window.alert("Please select an image!");

	} else {
		for (var i = 0; i < imagesArr.length; i++) {
			uploadImage(imagesArr[i]);
		}
	}
}

// Upload images to firebase
function uploadImage(imageFile) {
  return new Promise(function (resolve, reject) {
		// If uid is not populated, check again in 1s
		if (uid == "") {
			setTimeout(uploadImage(imageFile), 1000);
			return;
		}

		// Generate uuid
		var uuid = generateGuid();

		var fileName = imageFile.name;

		// Split the string using dot as separator
		var arr = fileName.split(".");

		// Get last element which will be the extension
		var extension = arr.pop();

		// Make new generated uuid the name
		var guidImageName = uuid + "." + extension;

		var storageRef = firebase.storage().ref('images/' + uid + "/" + batchKey + "/" + guidImageName);
		var uploadTask = storageRef.put(imageFile);

		uploadTask.on('state_changed', function(snapshot){

		}, function(error) {
			console.log("Failed to upload: " + fileName);
			console.log(error);

		}, function() {
			uploadTask.snapshot.ref.getDownloadURL().then(function(downloadURL) {
				var postKey = firebase.database().ref().push().key;
				var updates = {};
				var postData = {
					"name": fileName, 
					"guid": guidImageName,
					"url": 'images/' + uid + "/" + batchKey + "/" + guidImageName,
					"batchkey": batchKey,
					"availability": avail
				};

				var postLabelData = {
					"known": 1 // Label class only takes in Double values, 1 for true
				};

				//updates['/images/' + batchKey + '/' + postKey] = postData;
				updates['/images/' + postKey] = postData;

				// If there are tags entered, put the tags as labeled words in the database
				if (tagsArr.length != 0) {
					for (var i = 0; i < tagsArr.length; i ++) {
						updates['/labels/' + postKey + '/' + tagsArr[i]] = postLabelData;
					}
				}

				// Get current date
				var currentDate = new Date();
				var day = currentDate.getDate();
				var month = currentDate.getMonth() + 1;
				var year = currentDate.getFullYear();

				var datetime = day + "/" + month + "/" + year;

				// For batch identification, should only run once? 
				var batchData = {
					"batchname": batchName,
					"description": description,
					"tags": tags,
					"availability": avail,
					"datetime": datetime
				}
				
				updates['/batches/' + uid + '/' + batchKey] = batchData;
				
				firebase.database().ref().update(updates);
				
			});

			console.log('success');

			count++;
			if (count == imagesArr.length) {
				window.alert("All files successfully uploaded!");

				// Clear fields
				count = 0;
				document.getElementById("batchName").value = "";
				document.getElementById("description").value = "";
				document.getElementById("tags").value = "";
				document.getElementById("selectedImage").value = "";
				document.getElementById("published").checked = true;
				
				imagesArr = [];
			}
	  });
	});
}

// Function to generate uuid for unique image names
function generateGuid() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
		  .toString(16)
		  .substring(1);
	}

	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

// Check if string is alpha-numeric + space check
// This method is faster compared to regex
function isAlphaNumeric(str) {
  var code, i, len;

  for (i = 0, len = str.length; i < len; i++) {
    code = str.charCodeAt(i);
	if (!(code > 31 && code < 33) && // allow space
		!(code > 47 && code < 58) && // numeric (0-9)
		!(code > 64 && code < 91) && // upper alpha (A-Z)
		!(code > 96 && code < 123)) { // lower alpha (a-z)
			return false;
		}
  }
  return true;
};
