var user = firebase.auth().currentUser;
var name, email, uid = "";

firebase.auth().onAuthStateChanged(function(user) {
	if (user != null) {
		name = user.displayName;
		email = user.email;
		// alert(uid+"");
		// The user's ID, unique to the Firebase project. Do NOT use
		// this value to authenticate with your backend server, if
		// you have one. Use User.getToken() instead.
		uid = user.uid; 

		document.getElementById("adminWelcome").innerHTML = "Welcome, " + email;

		// Loading information to table and modal
		var batchRef = firebase.database().ref('/batches/' + uid + '/');
		var imageRef = firebase.database().ref('/images/');
		var labelRef = firebase.database().ref('/labels/');

		// View Detailed batch
		$("#batch_table").on('click', '.btn-view', function(e) {		
			// Get id of selected row, this is the batch id
			var $row = $(this).closest('tr'),
			rowId = $row.data('id');
			
			var count = 0;
			var imageDict = {}; // track image src element
			
			imageRef.once('value', function(snapshot) {				
				detailContent = '';
				
				// Clear previous entries
				$('#batch_details_table tbody').children().remove();
				
				snapshot.forEach(function(child) {
					var val = child.val();
					
					// If batch key matches the row id
					if (val.batchkey == rowId) 
					{					
						var keyName = 'image' + count;
						
						detailContent += '<tr data-id=' + child.key + '>';
						detailContent += '<td><img id="' + keyName + '"/></td>';
						detailContent += '<td>' + val.name + '</td>';
						detailContent += '<td>' + val.availability + '</td>';
						detailContent += '</tr>';
						
						//console.log(val.name);
						
						imageDict[keyName] = val.url;		
						count++;
					}
				});
				
				$('#batch_details_table').append(detailContent);
				document.getElementById("details_image_count").innerHTML = count;
				
				// Need to use forEach because Firebase function is asynchronous
				Object.keys(imageDict).forEach(function(key) {
					//console.log(key, imageDict[key]);
					
					var storageRef = firebase.storage().ref();
					var imageRef = storageRef.child(imageDict[key]);
					
					imageRef.getDownloadURL().then(function(url) {				
						var img = document.getElementById(key);
						img.src = url;
						
					}).catch(function(error) {
						// Handle any errors	
					});						
				});
			});
		});				
		
		batchRef.once('value', function(snapshot) {    
			if (snapshot.exists()) {
				var content = '';
			}

			snapshot.forEach(function(child) {	
				var val = child.val();
				//var availability = val.availability;
				var batchname = val.batchname;
				var description = val.description;
				var tags = val.tags;
				var datetime = val.datetime;

						
				content += '<tr data-id=' + child.key + '>';
				content += '<td>' + batchname + '</td>';
				content += '<td>' + description + '</td>';
				content += '<td>' + tags + '</td>';
				content += '<td><button class="btn btn-export">Export</button></td>';
				content += '<td><button class="btn btn-view" data-toggle="modal" data-target="#viewDetailsModal" data-id="' + child.key + '">Details</button></td>';
				content += '<td><button class="btn btn-delete">Delete</button></td>';
				content += '</tr>';
			});

			$('#batch_table').append(content);
		});			

		// Details modal	
		$('#viewDetailsModal').on('show.bs.modal', function(e) {
			//get data-id attribute of the clicked element
			var rowId = $(e.relatedTarget).data('id');
			
			batchRef.once('value', function(snapshot) {    
				if (snapshot.exists()) {
					var content = '';
				}

				snapshot.forEach(function(child) {	
					if (rowId == child.key) {
						var val = child.val();
						//var availability = val.availability;
						var batchname = val.batchname;
						var description = val.description;
						var tags = val.tags;
						var datetime = val.datetime;
					
						document.getElementById("details_batchname").innerHTML = batchname;
						document.getElementById("details_description").innerHTML = description;
						document.getElementById("details_tags").innerHTML = tags;
						document.getElementById("details_datetime").innerHTML = datetime;	
					}
				});
			});		
		});
		
		// For export and delete
		doExportDelete(batchRef, imageRef, labelRef);
	}
});

async function doExportDelete(batchRef, imageRef, labelRef) {
	var batchkeys = {};
	var imagekeys = {};
			
	// Get all batch keys belonging to user
	await batchRef.once('value', function(snapshot) {    
		snapshot.forEach(function(child) {
			batchkeys[child.key] = child.val().batchname;
		});
	});
	
	// Get all images belonging to batch key	
	for (var key in batchkeys){
		await imageRef.once('value', function(snapshot) {
			snapshot.forEach(function(child) {
				if (key == child.val().batchkey) {
					var name = child.val().name.split(".")[0];				
					imagekeys[child.key] = batchkeys[key] + "_" + name;
				}
			});
		});	
	}
	
	var HttpClient = (function() {
		this.get = function(aUrl, aCallback) {
			var anHttpRequest = new XMLHttpRequest();
			
			anHttpRequest.onreadystatechange = function() {
				if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
					aCallback(anHttpRequest.responseText);
			}
			
			anHttpRequest.open("GET", aUrl, true);
			anHttpRequest.send(null);
		}
	});
		
	// Delete batch
	// TODO: Should have confirm delete popup
	$("#batch_table").on('click', '.btn-delete', async function(e) {
		var $row = $(this).closest('tr'), rowId = $row.data('id');
		var rowId = $row.data('id');
				
		// Delete from storage
		var storage = firebase.storage();
		var storageRef = storage.ref();
		
		// Store keys and url of images belonging to Batch collection
		var remove = {};
		await imageRef.once('value', function(snapshot){
			snapshot.forEach(function(child){
				if (child.val().batchkey == rowId) {
					remove[child.key] = child.val().url;
				}
			});
		});
	
		// Delete from Batches collection
		batchRef.child(rowId).remove();
		
		var success = 0;
		Object.keys(remove).forEach(async function(key) {
			// Delete from Images and Labels collection		
			imageRef.child(key).remove();
			labelRef.child(key).remove();

			var batchStorageRef = storageRef.child(remove[key]);
				
			await batchStorageRef.delete().then(function() {
				// File deleted successfully
				success++;
				
			}).catch(function(error) {
				// Uh-oh, an error occurred!
				console.log("Error!");
			});
						
			if (success == Object.keys(remove).length) {
				window.alert("Batch deleted!");
			}			
		});
	});
		
	// TODO: Zip all json files
	// TODO: Download images json for reference
	$("#exportJson").click(function() {
		Object.keys(imagekeys).forEach(function(key) {
			var labelurl = 'https://imagehive-81725933.firebaseio.com/labels.json?orderBy="$key"&equalTo="' + key + '"&print=pretty&auth=IklNaqy5sjakprnWtWESywEqLiioIqgxMoZXsXSz';
			var client = new HttpClient();

			client.get(labelurl, function(response) {
				var blob = new Blob([response], {
					type: "application/json"
				});

				var jsonfile = imagekeys[key] + ".json";
				saveAs(blob, jsonfile);
			});		
		});	
	});

	// Export specific batch
	$("#batch_table").on('click', '.btn-export', async function(e) {
		var $row = $(this).closest('tr'), rowId = $row.data('id');
		var rowId = $row.data('id');
		
		var imagekeys = {};
		
		await imageRef.once('value', function(snapshot) {
			snapshot.forEach(function(child) {
				if (rowId == child.val().batchkey) {
					console.log(batchkeys[rowId]);
					var name = child.val().name.split(".")[0];				
					imagekeys[child.key] = batchkeys[rowId] + "_" + name;
				}
			});
		});	
		
		Object.keys(imagekeys).forEach(function(key) {
			var labelurl = 'https://imagehive-81725933.firebaseio.com/labels.json?orderBy="$key"&equalTo="' + key + '"&print=pretty&auth=IklNaqy5sjakprnWtWESywEqLiioIqgxMoZXsXSz';
			var client = new HttpClient();

			client.get(labelurl, function(response) {
				var blob = new Blob([response], {
					type: "application/json"
				});

				var jsonfile = imagekeys[key] + ".json";
				saveAs(blob, jsonfile);
			});		
		});	
	});
}

$(function() {
  $(document).on('change', ':file', function() {
    var input = $(this),
      numFiles = input.get(0).files ? input.get(0).files.length : 1,
      label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
    input.trigger('fileselect', [numFiles, label]);
  });

  $(document).ready(function() {
    $(':file').on('fileselect', function(event, numFiles, label) {

      var input = $(this).parents('.input-group').find(':text'),
        log = numFiles > 1 ? numFiles + ' files selected' : label;

      if (input.length) {
        input.val(log);
      } else {
        if (log) alert(log);
      }
    });

    $("#select_all").change(function() {
      if (this.checked) {
        $(':checkbox').each(function() {
          this.checked = true;
        });
      } else {
        $(':checkbox').each(function() {
          this.checked = false;
        });
      }
    });


  });
});

/* Taken from: https://www.w3schools.com/howto/howto_js_sort_table.asp */
function sortTable(n) {
  var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
  table = document.getElementById("batch_table");
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
  table = document.getElementById("batch_table");
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