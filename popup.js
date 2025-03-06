document.addEventListener('DOMContentLoaded', () => {
  const accountsList = document.getElementById('accounts-list');
  const wrenchIcon = document.getElementById('wrench-icon');

  if (wrenchIcon) {
    wrenchIcon.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  function renderAccounts () {
    chrome.storage.sync.get({ accounts: [] }, (data) => {
      accountsList.innerHTML = '';
      const accounts = data.accounts.sort((a, b) => a.category.localeCompare(b.category));
      const categorizedAccounts = {};
      accounts.forEach((account) => {
        const category = account.category || 'Uncategorized';
        if (!categorizedAccounts[category]) {
          categorizedAccounts[category] = [];
        }
        categorizedAccounts[category].push(account);
      });

      const sortedCategories = Object.keys(categorizedAccounts).sort((a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
      });

      sortedCategories.forEach((category) => {
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.textContent = category;
        accountsList.appendChild(categoryHeader);

        categorizedAccounts[category].forEach((account) => {
          const accountItem = document.createElement('div');
          accountItem.className = 'account-item';
          accountItem.innerHTML = `
            <div>
              <strong>${account.description}</strong>
              <br>Username: ${account.username}
            </div>
          `;
          accountItem.addEventListener('click', () => {
            autofill(account);
          });
          accountsList.appendChild(accountItem);
        });
      });
    });
  }

  accountsList.addEventListener('click', (e) => {
    if (e.target.classList.contains('autofill-btn')) {
      const index = e.target.getAttribute('data-index');
      chrome.storage.sync.get({ accounts: [] }, (data) => {
        const account = data.accounts[index];
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: autofillForm,
            args: [account.username, account.password]
          });
        });
      });
    }
  });

  renderAccounts();
});

function autofill (account) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: autofillForm,
      args: [account.username, account.password]
    });
  });
}

function autofillForm (username, password) {
  const usernameField = document.querySelector('input[type="text"], input[type="email"]');
  const passwordField = document.querySelector('input[type="password"]');
  if (usernameField && passwordField) {
    usernameField.value = username;
    passwordField.value = password;
  }
}
