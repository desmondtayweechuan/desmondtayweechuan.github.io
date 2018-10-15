var emailError = document.querySelector('#email-error');
var passwordError = document.querySelector('#password-error');
var emailErrorMessage = document.createElement('p');
emailErrorMessage.appendChild(
    document.createTextNode('Invalid email entered. Please try again')
);
var passwordErrorMessage = document.createElement('p');
passwordErrorMessage.appendChild(
    document.createTextNode('Invalid password entered. Please try again')
);



document.querySelector('#test').addEventListener('click', () => {
    // alert('IM PRESSED!');
    var i, email;
    var password = "12345678";
    for(i = 1; i<=100; i++){
        // console.log(`test${i}@hotmail.com`);
        email = `test${i}@hotmail.com`;
        firebase.auth().createUserWithEmailAndPassword(email, password).catch(function(error) {
            var errorCode = error.code;
            var errorMessage = error.message;
        });
        console.log(email + " added!");
    }
});


document.querySelector('#main-cfm').addEventListener('click', () => {
    var email = document.querySelector('[name="email"]').value;
    var password = document.querySelector('[name="password"]').value;

    if (!email) {
        emailError.appendChild(emailErrorMessage);
        return;
    }

    if (!password) {
        passwordError.appendChild(passwordErrorMessage);
        return;
    }

    signIn(email, password);
});

//Handle Account Status
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        window.location = 'export.html'; //After successful login, user will be redirected to upload.html
    }
});

function signIn(email, password) {
    firebase
        .auth()
        .signInWithEmailAndPassword(email, password)
        .catch(function(error) {
            // Handle Errors here.
            let errorCode = error.code;
            let errorMessage = error.message;
            console.log(errorCode + ': ' + errorMessage);
            window.alert(errorCode + ': ' + errorMessage);
        });
}
