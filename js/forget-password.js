let auth = firebase.auth();

var emailError = document.querySelector('#main-error');
var emailErrorMessage = document.createElement('p');
emailErrorMessage.appendChild(
    document.createTextNode('Invalid email entered. Please try again')
);

document.querySelector('#main-cfm').addEventListener('click', () => {
    var emailAddress = document.querySelector('[name="email"]').value;

    if (!emailAddress) {
        emailError.appendChild(emailErrorMessage);
        return;
    }

    resetPassword(emailAddress);
});

function resetPassword(emailAddress) {
    auth
        .sendPasswordResetEmail(emailAddress)
        .then(function() {
            alert(
                'Password reset email sent successfully. Please check your inbox.'
            );
            window.location = 'index.html';
        })
        .catch(function(error) {
            alert(error);
        });
}
