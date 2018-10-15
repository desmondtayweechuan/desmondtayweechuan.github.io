var user = firebase.auth().currentUser;
var uid = "";

firebase.auth().onAuthStateChanged(async function(user) {
	if (user != null) {
		uid = user.uid; 
		
		// Loading information to table and modal
		var controlRef = firebase.database().ref('/control/' + uid + '/');
		var imageRef = firebase.database().ref().child("images");
		var labelRef = firebase.database().ref().child("labels");

		// Get all control images belonging to user
		var correctTagsImages = {};
		var incorrectTagsImages = {};
		await controlRef.once('value', function(snapshot) {    
			if (snapshot.exists()) {
				var content = '';
			}

			snapshot.forEach(function(child) {	
				var val = child.val();
				var tags = val.correct_tags;
				var incorrectTags = val.incorrect_tags;				
				
				correctTagsImages[child.key] = tags;
				incorrectTagsImages[child.key] = incorrectTags;
			});
		});	
		
		Object.keys(correctTagsImages).forEach(async function(key) {		
			await imageRef.once('value', function(snapshot) {    
				if (snapshot.exists()) {
					var content = '';
				}
				
				snapshot.forEach(function(child) {		  
					content = '';
										
					if (child.val().batchkey == key) {		
						content += '<tr data-id=' + child.val().batchkey + '>';
						content += '<td><img id="img' + child.key + '"/></td>';
						content += '<td>' + correctTagsImages[key] + '</td>';
						content += '<td>' + incorrectTagsImages[key] + '</td>';
						content += '<td><button class="btn btn-edit" data-toggle="modal" data-target="#editQuestionModal" data-id="' + child.val().batchkey + '">Edit</button></td>';
						content += '<td><button class="btn btn-delete">Delete</button></td>';
						content += '</tr>';
							
						$('#control_questions_table').append(content);
				
						var storage = firebase.storage();
						var storageRef = storage.ref();
						var imageRef = storageRef.child(child.val().url);
						
						imageRef.getDownloadURL().then(function(url) {				
							var img = document.getElementById("img"+child.key);
							img.src = url;
							
						}).catch(function(error) {
							// Handle any errors	
						});	
					}
				});
			});
		});		
		
		// Delete a question		
		$("#control_questions_table").on('click', '.btn-delete', async function(e) {
			var $row = $(this).closest('tr'), rowId = $row.data('id');
			var rowId = $row.data('id');
						
			// Delete from storage
			var storage = firebase.storage();
			var storageRef = storage.ref();
			
			// Store keys and url of images belonging to control collection
			var remove = {};
			await imageRef.once('value', function(snapshot){
				snapshot.forEach(function(child){
					if (child.val().batchkey == rowId) {
						remove[child.key] = child.val().url;
					}
				});
			});
			
			// Delete from control collection
			controlRef.child(rowId).remove();
			
			Object.keys(remove).forEach(async function(key) {
				// Delete from Images and Labels collection		
				imageRef.child(key).remove();
				labelRef.child(key).remove();

				var controlStorageRef = storageRef.child(remove[key]);
					
				await controlStorageRef.delete().then(function() {
					// Deleted successfully
					window.alert("Question deleted!");
					location.reload();
					
				}).catch(function(error) {
					// Uh-oh, an error occurred!
					console.log("Error!");
				});	
			});			
		});
				
		// Delete all control questions
		$("#deleteAll").click(async function() {
			// Delete from storage
			var storage = firebase.storage();
			var storageRef = storage.ref();
			
			// Store keys and url of images belonging to control collection
			var keys = [];
			await controlRef.once('value', function(snapshot){
				snapshot.forEach(function(child){	
					keys.push(child.key);
				});
			});
			
			var remove = {};			
			for (var i in keys) {
				await imageRef.once('value', function(snapshot){
					snapshot.forEach(function(child){						
						if (child.val().batchkey == keys[i]) {
							remove[child.key] = child.val().url;
						}
					});
				});
			}
						
			var success = 0;
			console.log("clicked");
			/*
			Object.keys(remove).forEach(async function(key) {
				// Delete from Images and Labels collection		
				imageRef.child(key).remove();
				labelRef.child(key).remove();
				controlRef.remove();

				var controlStorageRef = storageRef.child(remove[key]);
					
				await controlStorageRef.delete().then(function() {
					// Deleted successfully
					success++;
					console.log("success");
					
				}).catch(function(error) {
					// Uh-oh, an error occurred!
					console.log("Error!");
				});
				
				if (success == Object.keys(remove).length) {		
					console.log("done");
					window.alert("All questions deleted!");
					location.reload();
				}
			});
			*/
		});
		
		$('#editQuestionModal').on('show.bs.modal', async function(e) {
			//get data-id attribute of the clicked element
			var rowId = $(e.relatedTarget).data('id');
			
			await controlRef.once('value', function(snapshot) {    
				if (snapshot.exists()) {
					var content = '';
				}

				snapshot.forEach(function(child) {				
					if (child.key == rowId) {
						var tags = child.val().correct_tags;
						var incorrectTags = child.val().incorrect_tags;						
						$(e.currentTarget).find('input[name="correctTags"]').val(tags);
						$(e.currentTarget).find('input[name="incorrectTags"]').val(incorrectTags);
					}
				});
			});
			
			$("#controlUpdate").unbind().click(async function() {
				var tags = $(e.currentTarget).find('input[name="correctTags"]').val();
				var incorrectTags = $(e.currentTarget).find('input[name="incorrectTags"]').val();
	
				// If user entered tags, it can only have alphabets or numbers and no spacing
				var tagsCheck = true;
				var tagsArr = [];
				var incorrectTagsArr = [];
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
				} else {			
					// Update control collection
					// No need to prepend /control/ or /label/ because of the controlRef and labelRef
					var updates = {};
					updates['/' + rowId + '/correct_tags/'] = tags;
					updates['/' + rowId + '/incorrect_tags/'] = incorrectTags;
					controlRef.update(updates);

					// Get image key of the control id
					var imagekey = "";
					await imageRef.once('value', function(snapshot) {    
						if (snapshot.exists()) {
							var content = '';
						}

						snapshot.forEach(function(child) {
							if (child.val().batchkey == rowId) {
								imagekey = child.key;
							}
						});
					});				

					var correctLabelData = {
						"admin_known": 1 // Label class only takes in Double values, 1 for true
					};
					
					var incorrectLabelData = {
						"admin_known": 2
					};
					
					// Update label collection
					if (imagekey !== "") {
						if (tagsArr.length != 0) {
							for (var i = 0; i < tagsArr.length; i ++) {
								updates['/' + imagekey + '/' + tagsArr[i]] = correctLabelData;
							}
						}
						
						if (incorrectTagsArr.length != 0) {
							for (var i = 0; i < incorrectTagsArr.length; i ++) {
								updates['/' + imagekey + '/' + incorrectTagsArr[i]] = incorrectLabelData;
							}
						}
						
						labelRef.update(updates);
						console.log("success");
						location.reload();
					}					
				}
			});
		});
	}
});


/* Taken from: https://www.w3schools.com/howto/howto_js_sort_table.asp */
function sortTable(n) {
  var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
  table = document.getElementById("p_batch_table");
  switching = true;
  //Set the sorting direction to ascending:
  dir = "asc";
  /*Make a loop that will continue until
  no switching has been done:*/
  while (switching) {
    //start by saying: no switching is done:
    switching = false;
    rows = table.getElementsByTagName("TR");
    /*Loop through all table rows (except the
    first, which contains table headers):*/
    for (i = 1; i < (rows.length - 1); i++) {
      //start by saying there should be no switching:
      shouldSwitch = false;
      /*Get the two elements you want to compare,
      one from current row and one from the next:*/
      x = rows[i].getElementsByTagName("TD")[n];
      y = rows[i + 1].getElementsByTagName("TD")[n];
      /*check if the two rows should switch place,
      based on the direction, asc or desc:*/
      if (dir == "asc") {
        if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
          //if so, mark as a switch and break the loop:
          shouldSwitch = true;
          break;
        }
      } else if (dir == "desc") {
        if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
          //if so, mark as a switch and break the loop:
          shouldSwitch = true;
          break;
        }
      }
    }
    if (shouldSwitch) {
      /*If a switch has been marked, make the switch
      and mark that a switch has been done:*/
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
      //Each time a switch is done, increase this count by 1:
      switchcount++;
    } else {
      /*If no switching has been done AND the direction is "asc",
      set the direction to "desc" and run the while loop again.*/
      if (switchcount == 0 && dir == "asc") {
        dir = "desc";
        switching = true;
      }
    }
  }
}

/** Taken from: https://www.w3schools.com/howto/howto_js_filter_table.asp **/
function filterTable() {
  // Declare variables
  var input, filter, table, tr, name, tag, i;
  input = document.getElementById("myInput");
  filter = input.value.toUpperCase();
  table = document.getElementById("control_questions_table");
  tr = table.getElementsByTagName("tr");

  // Loop through all table rows, and hide those who don't match the search query
  for (i = 0; i < tr.length; i++) {
    name = tr[i].getElementsByTagName("td")[1];
    tag = tr[i].getElementsByTagName("td")[5];
    if (name || tag) {
      if (name.innerHTML.toUpperCase().indexOf(filter) > -1 || tag.innerHTML.toUpperCase().indexOf(filter) > -1) {
        tr[i].style.display = "";
      } else {
        tr[i].style.display = "none";
      }
    }
  }
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