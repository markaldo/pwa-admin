const recipes = document.querySelector('.recipes');

document.addEventListener('DOMContentLoaded', function() {
  // nav menu
  const menus = document.querySelectorAll('.side-menu');
  M.Sidenav.init(menus, {edge: 'right'});
  // add recipe form
  const forms = document.querySelectorAll('.side-form');
  M.Sidenav.init(forms, {edge: 'left'});
});

// Check authentication state before allowing access to index.html
document.addEventListener('DOMContentLoaded', function() {
  const isLoggedIn = localStorage.getItem('isLoggedIn');

  if (!isLoggedIn) {
      // Redirect user to login page if not logged in
      window.location.href = '/pages/login.html';
  }
});

// setup materialize components
document.addEventListener('DOMContentLoaded', function() {

  var modals = document.querySelectorAll('.modal');
  M.Modal.init(modals);

  var items = document.querySelectorAll('.collapsible');
  M.Collapsible.init(items);

});

// render recipe data
const renderRecipe = (data, id) => {
  let imageUrl = (data.url !== null && data.url !== undefined) ? data.url : '/img/bread.png';
  const html = `
    <div class="card-panel recipe white row" data-id="${id}">
      <img src="${imageUrl}" alt="recipe thumb">
      <div class="recipe-details">
        <div class="recipe-title">${data.name}</div>
        <div class="recipe-ingredients">${data.ingredients}</div>
      </div>
      <div class="recipe-price">PLN ${data.price}</div>
      <div class="recipe-delete">
        <i class="material-icons" data-id="${id}">delete_outline</i>
      </div>
    </div>
  `;
  recipes.innerHTML += html;
};

// remove recipe
const removeRecipe = (id) => {
  const recipe = document.querySelector(`.recipe[data-id=${id}]`);
  recipe.remove();
};

document.addEventListener('DOMContentLoaded', function() {
  // Get the price input field
  const priceInput = document.getElementById('price');

  // Add event listener for input event
  priceInput.addEventListener('input', function() {
      const enteredValue = this.value.trim();
      const numberPattern = /^\d*\.?\d*$/;

      if (!numberPattern.test(enteredValue)) {
          this.value = '';
      }
  });
});

document.addEventListener('DOMContentLoaded', function() {
  const passwordForm = document.querySelector('#change-password');
  
  passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get user input
    const password = passwordForm['password'].value;
    const confirmation = passwordForm['confirm-password'].value;
    
    // Check if passwords match
    if (password !== confirmation) {
      document.querySelector('.error').textContent = "Passwords do not match";
      return; // Stop further execution if passwords do not match
    }
    
    // Get the current user
    const user = firebase.auth().currentUser;

    // Get the new password from the user input
    const newPassword = password;

    // Update the password
    user.updatePassword(newPassword)
      .then(() => {
        // Password updated successfully
        document.querySelector('.error').textContent = "Password updated successfully";
        passwordForm.reset(); // Reset the form
      })
      .catch((error) => {
        // An error occurred while updating the password
        document.querySelector('.error').textContent = "" + error.message;
        alert('Error updating password: ' + error.message);
      });
  });
});

// logout
function logout() {
  
  auth.signOut().then(() => {
     // Clear isLoggedIn value
    localStorage.removeItem('isLoggedIn');

    // Redirect to login page
    window.location.href = '/pages/login.html';
  })
};




