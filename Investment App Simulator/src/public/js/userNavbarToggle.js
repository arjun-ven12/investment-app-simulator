document.addEventListener("DOMContentLoaded", function () {
    const loginButton = document.getElementById("loginButton");
    const registerButton = document.getElementById("registerButton");
    const profileButton = document.getElementById("profileButton");
    const logoutButton = document.getElementById("logoutButton");
    const HomeButton = document.getElementById("HomeButton");
    const ProgressButton = document.getElementById("ProgressButton");
    const UserButton = document.getElementById("UserButton");
    const TaskButton = document.getElementById("TaskButton");
    const MessageButton = document.getElementById("MessageButton");

    
    

  
    // Check if token exists in local storage
    const token = localStorage.getItem("token");
    if (token) {
      // Token exists, show profile button and hide login and register buttons, user login
      profileButton.classList.remove("d-none");
      logoutButton.classList.remove("d-none");
      HomeButton.classList.remove("d-none");
      ProgressButton.classList.remove("d-none");
      UserButton.classList.remove("d-none");
      TaskButton.classList.remove("d-none");
      MessageButton.classList.remove("d-none");

      loginButton.classList.add("d-none");
      registerButton.classList.add("d-none");
     

    } else {
      // Token does not exist, show login and register buttons and hide profile and logout buttons , user logout
      profileButton.classList.add("d-none");
      logoutButton.classList.add("d-none");
      HomeButton.classList.add("d-none");
      ProgressButton.classList.add("d-none");
      UserButton.classList.add("d-none");
      TaskButton.classList.add("d-none");
      MessageButton.classList.add("d-none");

      loginButton.classList.remove("d-none");
      registerButton.classList.remove("d-none");

    }
  
    logoutButton.addEventListener("click", function () {
      // Remove the token from local storage and redirect to index.html
      localStorage.removeItem("token");
      window.location.href = "index.html";
    });
  });