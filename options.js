document.addEventListener('DOMContentLoaded', () => {
  const addPasswordForm = document.getElementById('add-password-form');
  const accountsList = document.getElementById('accounts-list');
  const exportButton = document.getElementById('export-btn');
  const importButton = document.getElementById('import-btn');
  const importFileInput = document.getElementById('import-file');

  addPasswordForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const accountName = document.getElementById('account-name').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const category = document.getElementById('category').value || '';

    const account = { id: generateUUID(), description: accountName, username, password, category };

    chrome.storage.sync.get({ accounts: [] }, (data) => {
      const accounts = data.accounts;
      accounts.push(account);
      chrome.storage.sync.set({ accounts }, () => {
        renderAccounts();
        addPasswordForm.reset();
      });
    });
  });

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
            <div class="button-group">
              <button class="modify-btn" data-index="${account.id}">
                <img src="icons/pen.svg" alt="Modify">
              </button>
              <button class="duplicate-btn" data-index="${account.id}">
                <img src="icons/clipboard.svg" alt="Duplicate">
              </button>
              <button class="remove-btn" data-index="${account.id}">
                <img src="icons/trash.svg" alt="Remove">
              </button>
            </div>
          `;
          accountsList.appendChild(accountItem);
        });
      });
    });
  }

  accountsList.addEventListener('click', (e) => {
    const id = e.target.closest('button').getAttribute('data-index');
    if (e.target.closest('button').classList.contains('remove-btn')) {
      if (confirm('Are you sure you want to remove this account?')) {
        chrome.storage.sync.get({ accounts: [] }, (data) => {
          const accounts = data.accounts.filter(account => account.id !== id);
          chrome.storage.sync.set({ accounts }, () => {
            renderAccounts();
          });
        });
      }
    } else if (e.target.closest('button').classList.contains('modify-btn')) {
      chrome.storage.sync.get({ accounts: [] }, (data) => {
        const account = data.accounts.find(account => account.id === id);
        document.getElementById('account-name').value = account.description;
        document.getElementById('username').value = account.username;
        document.getElementById('password').value = account.password;
        document.getElementById('category').value = account.category;
        const updatedAccounts = data.accounts.filter(account => account.id !== id);
        chrome.storage.sync.set({ accounts: updatedAccounts }, () => {
          renderAccounts();
        });
      });
    } else if (e.target.closest('button').classList.contains('duplicate-btn')) {
      chrome.storage.sync.get({ accounts: [] }, (data) => {
        const account = data.accounts.find(account => account.id === id);
        const duplicatedAccount = { ...account, id: generateUUID() };
        data.accounts.push(duplicatedAccount);
        chrome.storage.sync.set({ accounts: data.accounts }, () => {
          renderAccounts();
        });
      });
    }
  });

  exportButton.addEventListener('click', () => {
    chrome.storage.sync.get({ accounts: [] }, (data) => {
      const accounts = data.accounts;
      const blob = new Blob([JSON.stringify(accounts, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'passwords.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  importButton.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        let importedAccounts = JSON.parse(e.target.result);
        importedAccounts = importedAccounts.map(account => {
          if (!account.id || typeof account.id !== 'string') {
            account.id = generateUUID();
          }
          return account;
        });
        chrome.storage.sync.get({ accounts: [] }, (data) => {
          const existingAccounts = data.accounts;
          const mergedAccounts = mergeAccounts(existingAccounts, importedAccounts);
          chrome.storage.sync.set({ accounts: mergedAccounts }, () => {
            renderAccounts();
          });
        });
      };
      reader.readAsText(file);
    }
  });

  renderAccounts();
});

function generateUUID () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function mergeAccounts (existingAccounts, importedAccounts) {
  const accountMap = new Map();
  existingAccounts.forEach(account => accountMap.set(account.id, account));
  importedAccounts.forEach(account => accountMap.set(account.id, account));
  return Array.from(accountMap.values());
}
