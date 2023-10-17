var Login = (function() {
  var loginEmail = "";
  var loginPassword = "";
  var loginButton = null;

  var init = function() {
    var loginEmailInput = document.getElementById("login-email-input");
    var loginPasswordInput = document.getElementById("login-password-input");
    loginButton = document.getElementById("login-button");

    loginEmailInput.addEventListener("change", function() {
      loginEmail = loginEmailInput.value;
      loginButton.disabled = !loginEmail || !loginPassword;
    });
    loginPasswordInput.addEventListener("change", function() {
      loginPassword = loginPasswordInput.value;
      loginButton.disabled = !loginEmail || !loginPassword;
    });
  };

  var login = function() {
    if(!loginEmail || !loginPassword) {
      loginButton && (loginButton.disabled = true);
      return;
    }
    loginButton && loginButton.parent && (loginButton.parent.style.display = "none");

    Kaltura.login(loginEmail, loginPassword).then(function() {
      return Kaltura.getLiveChannels();
    }).then(function(channels) {
      return Kaltura.extendChannelsWithLiveEpg(channels);
    }).then(function() {
      location.href = 'channels.html'
    }).catch(function(error) {
      console.error(error);
      loginButton && loginButton.parent && (loginButton.parent.style.display = "block");
    });
  };

  return {
    init,
    login,
  }
})();