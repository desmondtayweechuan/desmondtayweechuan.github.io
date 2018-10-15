document.querySelector('[name="file-select"]').addEventListener('change', handleFileUploadChange);
document.querySelector('[name="submit-question"]').addEventListener('click', handleFileUploadSubmit);

var user = firebase.auth().currentUser;
var uid = "";
var tagsArr = [];
var incorrectTagsArr = [];
	
firebase.auth().onAuthStateChanged(function(user) {
	if (user != null) {
		uid = user.uid; 	
	}
});

// When user selects file, assign to variable
let selectedFile;
function handleFileUploadChange(e) {
	selectedFile = e.target.files[0];
}

// When user selects upload, perform upload
function handleFileUploadSubmit(e) {
	var tags = document.getElementById("correctTags").value;	
	var incorrectTags = document.getElementById("incorrectTags").value;
	console.log(tags);
	console.log(incorrectTags);
	
	// If user entered tags, it can only have alphabets or numbers and no spacing
	var tagsCheck = true;
	if (tags !== "" && incorrectTags !== "") {
		tagsArr = tags.split(",");
		incorrectTagsArr = incorrectTags.split(",");

		for (var i = 0; i < tagsArr.length; i++) {
			// If tags does not match the alphanumeric check, then reject the user input
			if (!isAlphaNumeric(tagsArr[i])) {
				tagsCheck = false;
				break;
			}
		}
		
		for (var i = 0; i < incorrectTagsArr.length; i++) {
			// If tags does not match the alphanumeric check, then reject the user input
			if (!isAlphaNumeric(incorrectTagsArr[i])) {
				tagsCheck = false;
				break;
			}
		}
	} else {
		tagsCheck = false;
	}
	
	if (!tagsCheck) {
		window.alert("Please ensure tags only have alphabets or numbers, no spacing is allowed.");
	} else if (!selectedFile) {
		window.alert("Please select an image!"); 
	} else {
		uploadQuestion(tags, incorrectTags);
	}
}

function uploadQuestion(tags, incorrectTags) {
	// If uid is not populated, check again in 1s
	if (uid == "") {
		setTimeout(uploadQuestion(tags, incorrectTags), 1000);
		return;
	}

	// Generate uuid
	var uuid = generateGuid();

	var fileName = selectedFile.name;
	
	// Split the string using dot as separator
	var arr = fileName.split(".");

	// Get last element which will be the extension
	var extension = arr.pop();

	// Make new generated uuid the name
	var guidImageName = uuid + "." + extension;

	var storageRef = firebase.storage().ref('images/control/' + guidImageName);
	var uploadTask = storageRef.put(selectedFile);
		
	var controlkey = firebase.database().ref().push().key;
	
	uploadTask.on('state_changed', function(snapshot){

	}, function(error) {
		console.log("Failed to upload: " + fileName);
		console.log(error);

	}, function() {
		uploadTask.snapshot.ref.getDownloadURL().then(function(downloadURL) {
			var postKey = firebase.database().ref().push().key;
			var updates = {};
			var postManageData = {
				"correct_tags": tags,
				"incorrect_tags": incorrectTags
			};
			
			// For user to change tags
			updates['/control/' + uid + '/' + controlkey + '/'] = postManageData; 
			
			var postData = {
				"name": fileName, 
				"guid": guidImageName,
				"url": 'images/control/' + guidImageName,
				"batchkey": controlkey,
				"availability": "control"
			};
						
			// To load control questions into game
			updates['/images/' + postKey + '/'] = postData;
			
			// 1 represents correct tag, 2 represents incorrect tag
			var correctLabelData = {
				"admin_known": 1
			};
			
			var incorrectLabelData = {
				"admin_known": 2
			};
			
			// If there are tags entered, put the tags as labeled words in the database
			if (tagsArr.length != 0) {
				for (var i = 0; i < tagsArr.length; i ++) {
					updates['/labels/' + postKey + '/' + tagsArr[i]] = correctLabelData;
				}
			}
			
			if (incorrectTagsArr.length != 0) {
				for (var i = 0; i < incorrectTagsArr.length; i ++) {
					updates['/labels/' + postKey + '/' + incorrectTagsArr[i]] = incorrectLabelData;
				}
			} 
			
			firebase.database().ref().update(updates);
		
			console.log('success');
		
			window.alert("Control question set!");
			
			// Clear
			document.getElementById("correctTags").value = "";
			document.getElementById("incorrectTags").value = "";
			document.getElementById("selectedImage").value = "";
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
