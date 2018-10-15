var user = firebase.auth().currentUser;
var uid = "";

firebase.auth().onAuthStateChanged(function(user) {
	if (user != null) {
		uid = user.uid; 
		
		// Loading information to table and modal
		var batchRef = firebase.database().ref('/batches/' + uid + '/');
		var imageRef = firebase.database().ref().child("images");
		var labelRef = firebase.database().ref().child("labels");		

		batchRef.once('value', function(snapshot) {    
			if (snapshot.exists()) {
				var content = '';
			}

			snapshot.forEach(function(child) {	
				var val = child.val();
				var availability = val.availability;
				var batchname = val.batchname;
				var description = val.description;
				var tags = val.tags;
				var datetime = val.datetime;
						
				content += '<tr data-id=' + child.key + '>';
				content += '<td>' + batchname + '</td>';
				content += '<td>' + description + '</td>';
				content += '<td>' + tags + '</td>';
				content += '<td>' + availability + '</td>';
				content += '<td><button class="btn btn-change">Change</button></td>';
				content += '<td><button class="btn btn-edit" data-toggle="modal" data-target="#editPublicationsModal" data-id="'+ child.key + '">Edit</button></td>';
				content += '</tr>';			
			});

			$('#p_batch_table').append(content);
		});	
		
		// Make all batches belonging to user published
		$("#publishAll").click(async function() {
			updateAllAvailability(batchRef, imageRef, "published");
		});

		// Make all batches belonging to user hidden
		$("#hideAll").click(async function() {
			updateAllAvailability(batchRef, imageRef, "hidden");
		});
		
		// Toggles availability status
		$("#p_batch_table").on('click', '.btn-change', async function(e) {
			var $row = $(this).closest('tr'), rowId = $row.data('id');
			var rowId = $row.data('id');

			// Get current availability status
			var current = "";
			await batchRef.once('value', function(snapshot) {    
				if (snapshot.exists()) {
					var content = '';
				}

				snapshot.forEach(function(child) {		  
					if (child.key == rowId) {
						var val = child.val();
						current = val.availability;	
					}
				});
			});	
			
			// Update availability (batches)
			var state = "";
			
			if (current == "published") {
				state = "hidden";
			}
			
			if (current == "hidden") {
				state = "published";
			}
			
			var updates = {};
			updates['/' + rowId + '/availability/'] = state;
			
			batchRef.update(updates);			
						
			// Get all images belonging to batch
			var imagestatus = {};			
			await imageRef.once('value', function(snapshot) {    
				if (snapshot.exists()) {
					var content = '';
				}

				snapshot.forEach(function(child) {		  
					if (child.val().batchkey == rowId) {
						imagestatus[child.key] = child.val().availability;
					}
				});
			});	
			
			// Update availability (images)
			Object.keys(imagestatus).forEach(function(key) {					
				console.log(key);
				
				var state = "";
			
				if (imagestatus[key] == "published") {
					state = "hidden";
				}
				
				if (imagestatus[key] == "hidden") {
					state = "published";
				}
				
				var updates = {};
				updates['/' + key + '/availability/'] = state;
				
				imageRef.update(updates);
			});
			
			console.log("done");
			location.reload();
		});		
	}
	
	// Edit
	$('#editPublicationsModal').on('show.bs.modal', async function(e) {
		//get data-id attribute of the clicked element
		var rowId = $(e.relatedTarget).data('id');

		await batchRef.once('value', function(snapshot) {    
			if (snapshot.exists()) {
				var content = '';
			}

			snapshot.forEach(function(child) {		  
				if (child.key == rowId) {
					var val = child.val();
					var batchname = val.batchname;
					var description = val.description;
					var tags = val.tags;					
					
					$(e.currentTarget).find('input[name="batchname"]').val(batchname);
					$(e.currentTarget).find('textarea[name="description"]').val(description);
					$(e.currentTarget).find('input[name="tags"]').val(tags);
				}
			});
		});

		$("#batchUpdate").unbind().click(async function() {
			var batchname = $(e.currentTarget).find('input[name="batchname"]').val();
			var description = $(e.currentTarget).find('textarea[name="description"]').val();
			var tags = $(e.currentTarget).find('input[name="tags"]').val();
						
			// If user entered tags, it can only have alphabets or numbers and no spacing
			var tagsCheck = true;
			var tagsArr = [];
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
			
			if (!tagsCheck) {
				window.alert("Please ensure tags only have alphabets or numbers, no spacing is allowed.");				
			} else {
				console.log(rowId);
				
				// Update batches collection
				var updates = {};
				updates['/' + rowId + '/batchname/'] = batchname;
				updates['/' + rowId + '/description/'] = description;
				updates['/' + rowId + '/tags/'] = tags;
				
				batchRef.update(updates);

				// Update labels collection
				// First, get all images belonging to batch
				updates = {};
				var updateimages = [];
				await imageRef.once('value', function(snapshot) {    
					if (snapshot.exists()) {
						var content = '';
					}

					snapshot.forEach(function(child) {
						if (child.val().batchkey == rowId) {
							updateimages.push(child.key);
						}
					});
				});
				
				var postLabelData = {
					"known": 1 // Label class only takes in Double values, 1 for true
				};
				
				// Update label for each image
				for (var img in updateimages) {
					if (tagsArr.length != 0) {
						for (var i = 0; i < tagsArr.length; i ++) {
							updates['/' + updateimages[img] + '/' + tagsArr[i]] = postLabelData;
						}
					}
					console.log("done");
				}
				
				labelRef.update(updates);
				console.log("success");
				location.reload();
			}
		});		
	});
});

async function updateAllAvailability(batchRef, imageRef, state) {
	// Get current availability status
	var batchstatus = {};
	await batchRef.once('value', function(snapshot) {    
		if (snapshot.exists()) {
			var content = '';
		}

		snapshot.forEach(function(child) {
			batchstatus[child.key] = child.val().availability;
		});
	});

	// Update availability (batches)
	Object.keys(batchstatus).forEach(function(key) {
		var updates = {};
		updates['/' + key + '/availability/'] = state;
		
		batchRef.update(updates);
	});
	
	// Get all images belonging to batch
	var imagestatus = {};
	await imageRef.once('value', function(snapshot) {    
		if (snapshot.exists()) {
			var content = '';
		}
		
		Object.keys(batchstatus).forEach(function(batchkey) {
			console.log(batchkey);
				
			snapshot.forEach(function(child) {		  
				if (child.val().batchkey == batchkey) {
					console.log(child.key);
					imagestatus[child.key] = child.val().availability;
				}
			});
		});	
	});	
		
	// Update availability (images)
	Object.keys(imagestatus).forEach(function(key) {					
		var updates = {};
		updates['/' + key + '/availability/'] = state;
		
		imageRef.update(updates);
	});
		
	location.reload();		
}

$(function() {
  $(document).ready(function() {
    $("#select_all").change(function() {
      if (this.checked) {
        $('.checkbox-publish:checkbox').each(function() {
          this.checked = true;
        });
      } else {
        $('.checkbox-publish:checkbox').each(function() {
          this.checked = false;
        });
      }
    });

    $("#select_all_edit").change(function() {
      if (this.checked) {
        $('.checkbox-edit:checkbox').each(function() {
          this.checked = true;
        });
      } else {
        $('.checkbox-edit:checkbox').each(function() {
          this.checked = false;
        });
      }
    });


  });
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
  table = document.getElementById("p_batch_table");
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