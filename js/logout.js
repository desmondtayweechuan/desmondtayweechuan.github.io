document.querySelector('[name="logout"]').addEventListener('click', () => {
    firebase
        .auth()
        .signOut()
        .then(function() {
            // Sign-out successful.
            console.log('Logged out');
        })
        .catch(function(error) {
            alert(error);
        });
});

//Handle Account Status
firebase.auth().onAuthStateChanged(user => {
    if (!user) {
        window.location = 'index.html';
    }
});
