// global
const btnId = 'npm-comparison-add-btn-make-sure-unique';
const containerId = 'npm-comparison-container-make-sure-unique';
const emptyHtml = '<div class="empty" title="empty repository">-</div>';
const emptyMarkdown = '-';
let markdownContent = '';

// 数据来源： https://flat.badgen.net/npm
const npmBadgeConfigsList = [
  {
    label: 'version',
    value: 'v',
    default: true,
  },
  {
    label: 'weekly download',
    value: 'dw',
    default: true,
  },
  {
    label: 'monthly download',
    value: 'dm',
    default: false,
  },
  {
    label: 'yearly download',
    value: 'dy',
    default: false,
  },
  {
    label: 'total download',
    value: 'dt',
    default: false,
  },
  {
    label: 'license',
    value: 'license',
    default: true,
  },
  {
    label: 'node version',
    value: 'node',
    default: false,
  },
  {
    label: 'dependents',
    value: 'dependents',
    default: true,
  },
  {
    label: 'types',
    value: 'types',
    default: true,
  },
];

// 数据来源： https://flat.badgen.net/github
const githubBadgeConfigsList = [
  {
    label: 'license',
    value: 'license',
    default: false,
  },
  {
    label: 'watchers',
    value: 'watchers',
    default: false,
  },
  {
    label: 'branches',
    value: 'branches',
    default: false,
  },
  {
    label: 'releases',
    value: 'releases',
    default: false,
  },
  {
    label: 'tags',
    value: 'tags',
    default: false,
  },
  {
    label: 'latest tag',
    value: 'tag',
    default: false,
  },
  {
    label: 'stars',
    value: 'stars',
    default: true,
    generateImg(package, isHtml = true) {
      // shields 的 stars 更美观
      const githubURL = getGithubURL(package);
      const imgURL = githubURL ? `https://img.shields.io/github/stars/${getAutor(githubURL)}/${getRepo(githubURL) || package.name}?color=white&label` : '';
      if (isHtml) {
        return imgURL ? `<a target="_blank" href="${package.homepage}"><img alt="stars" src="${imgURL}" /></a>` : emptyHtml;
      }
      return imgURL ? `[![stars](${imgURL})](${imgURL})` : emptyMarkdown;
    },
  },
  {
    label: 'forks',
    value: 'forks',
    default: false,
  },
  {
    label: 'commits count',
    value: 'commits',
    default: false,
  },
  {
    label: 'last commit',
    value: 'last-commit',
    default: true,
  },
  {
    label: 'issues',
    value: 'issues',
    default: true,
  },
  {
    label: 'open issues',
    value: 'open-issues',
    default: true,
  },
  {
    label: 'closed issues',
    value: 'closed-issues',
    default: true,
  },
];

// 其他配置
const themeConfigsList = [
  {
    label: 'Transpose table',
    value: 'transpose-table',
    default: false,
  },
];

(async function () {
  await initPanle();
  initAddBtn();
  render();
  observerTitle();
})();

// 如果在 https://www.npmjs.com/package/vue 这样的详情页面直接搜索其他 npm 包，比如 vite
// 在搜索下拉列表选择 vite ，此时虽然页面地址会变化，但是似乎并不会触发关于路由变化的事件，也不会刷新页面
// 于是决定来监听页面标题部分，如果这边有变化，说明有更新，进行一次重新初始化的操作
function observerTitle() {
  const mb = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'characterData') {
        initAddBtn();
      }
    }
  });
  mb.observe(document.querySelector('#main h2'), { childList: true, subtree: true, characterData: true });
}

async function getStorage(area = 'local', key, defaultValue) {
  return new Promise((resolve) => {
    chrome.storage[area].get(key, (result) => {
      if (chrome.runtime.lastError) {
        resolve(defaultValue);
      } else {
        resolve(result[key] ?? defaultValue);
      }
    });
  });
}

async function getPackageList() {
  return getStorage('local', 'packageList', []);
}

async function fetchPackageData(list) {
  const result = [];
  for (const packageName of list) {
    try {
      const response = await fetch('https://registry.npmjs.org/' + decodeURIComponent(packageName));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      result.push(data);
    } catch (error) {
      console.error('Error fetching data for package:', packageName, error);
    }
  }
  return result;
}

async function render(list) {
  if (!Array.isArray(list)) {
    list = await getPackageList();
  }

  toggleAddBtnHidden(list);

  let container = document.querySelector(`#${containerId} section.body`);
  if (!container) {
    return;
  }

  if (!list.length) {
    container.innerHTML = '';
    return;
  }

  const npmBadgeUser = await getStorage('sync', 'npm', {});
  const npmBadgeConfigsListChecked = npmBadgeConfigsList.filter((c) => npmBadgeUser[c.value] ?? c.default);

  const githubBadgeUser = await getStorage('sync', 'github', {});
  const githubBadgeConfigsListChecked = githubBadgeConfigsList.filter((c) => githubBadgeUser[c.value] ?? c.default);

  const fragment = document.createDocumentFragment();
  const packageList = await fetchPackageData(list);

  const isTransposed = (await getStorage('sync', 'theme', {}))['transpose-table'];

  if (isTransposed) {
    packageList.forEach((pkg) => {
      const row = document.createElement('tr');
      row.innerHTML = `
      <td>
        ${generateTitle(pkg)}
      </td>
         ${npmBadgeConfigsListChecked.map((config) => `<td>${generateNpmImg(config, pkg)}</td>`).join('')}
        ${githubBadgeConfigsListChecked.map((config) => `<td>${generateGithubImg(config, pkg)}</td>`).join('')}  
    `;
      fragment.appendChild(row);
    });

    container.innerHTML = `
      <table>
          <thead>
              <tr>
                  <th>Package Name</th>
                ${[...npmBadgeConfigsListChecked, ...githubBadgeConfigsListChecked].map((config) => `<th>${config.label}</th>`).join('')}
              </tr>
          </thead>
          <tbody></tbody>
      </table>
    `;
  } else {
    npmBadgeConfigsListChecked.forEach((config) => {
      const row = document.createElement('tr');
      row.innerHTML = `
     
      <td>${config.label}</td>
         ${packageList.map((pkg) => `<td>${generateNpmImg(config, pkg)}</td>`).join('')}
    `;
      fragment.appendChild(row);
    });

    githubBadgeConfigsListChecked.forEach((config) => {
      const row = document.createElement('tr');
      row.innerHTML = `
     
      <td>${config.label}</td>
         ${packageList.map((pkg) => `<td>${generateGithubImg(config, pkg)}</td>`).join('')}
    `;
      fragment.appendChild(row);
    });

    container.innerHTML = `
          <table>
              <thead>
                  <tr>
                      <th></th>
                    ${packageList.map((pkg) => `<th>${generateTitle(pkg)}</th>`).join('')}
                  </tr>
              </thead>
              <tbody></tbody>
          </table>
    `;
  }

  container.querySelector('tbody').appendChild(fragment);

  markdownContent = generateMarkdownTable(packageList, npmBadgeConfigsListChecked, githubBadgeConfigsListChecked, isTransposed);

  // console.log('Package Data:', packageList);
}

function initAddBtn() {
  let $btn = document.getElementById(btnId);

  if ($btn) {
    $btn.remove();
  } else {
    $btn = document.createElement('button');
    $btn.id = btnId;
    $btn.className = 'button-72';
    $btn.textContent = 'Add to npm Comparison';
  }
  document.querySelector('#main h2').appendChild($btn);
  $btn.addEventListener('click', async () => {
    const list = await getPackageList();
    const package = location.pathname.replace('/package/', '');
    if (!list.includes(package)) {
      list.push(package);
      chrome.storage.local.set({ packageList: list }, () => {
        render(list);
      });
    }
  });
}

async function initPanle() {
  const $panel = document.createElement('div');
  $panel.id = containerId;

  const npmConfig = await getStorage('sync', 'npm', {});
  const githubConfig = await getStorage('sync', 'github', {});
  const themeConfig = await getStorage('sync', 'theme', {});

  $panel.innerHTML = `
    <div class="toggle-show-panel"></div>
    <section class="container">
       <section class="header">
          <details>
            <summary></summary>
            ${renderConfigPanle('npm', npmBadgeConfigsList, npmConfig)}
            ${renderConfigPanle('github', githubBadgeConfigsList, githubConfig)}
            ${renderConfigPanle('theme', themeConfigsList, themeConfig)}
          </details>
        </section>
        <section class="tool">
          <button class="copy-markdown button-72">copy table to markdown</button>
          <button class="copy-html button-72">copy table to html</button>
        </section>
        <section class="body">
        </section>
    </section>
  `;

  $panel.addEventListener(
    'change',
    async (e) => {
      const type = e.target.dataset.type;
      if (!/(npm)|(github)|(theme)/.test(type)) return;

      const badge = e.target.name;
      const value = e.target.checked;

      const _data = await getStorage('sync', type, {});
      Object.assign(_data, { [badge]: value });

      chrome.storage.sync.set({ [type]: _data }, () => {
        render();
      });
    },
    false
  );

  $panel.addEventListener(
    'click',
    async (e) => {
      if (e.target.dataset.package) {
        const package = e.target.dataset.package;
        const list = await getPackageList();
        const i = list.indexOf(package);

        if (i !== -1) {
          list.splice(i, 1);
          chrome.storage.local.set({ packageList: list }, () => {
            render(list);
          });
        }
      }
    },
    false
  );

  $panel.querySelector('.toggle-show-panel').addEventListener('click', () => {
    $panel.classList.toggle('hide');
  });

  $panel.querySelector('.copy-markdown').addEventListener(
    'click',
    (e) => {
      navigator.clipboard.writeText(markdownContent).then(() => {
        const old = e.target.textContent;
        e.target.textContent = 'copy success!!';
        setTimeout(() => {
          e.target.textContent = old;
        }, 2000);
      });
    },
    false
  );

  $panel.querySelector('.copy-html').addEventListener(
    'click',
    (e) => {
      const tableStr = generateHTMLTable();
      navigator.clipboard.writeText(tableStr).then(() => {
        const old = e.target.textContent;
        e.target.textContent = 'copy success!!';
        setTimeout(() => {
          e.target.textContent = old;
        }, 2000);
      });
    },
    false
  );

  document.body.appendChild($panel);
}

// 更新按钮的可见性
async function toggleAddBtnHidden(packageList) {
  const $btn = document.getElementById(btnId);
  if (!$btn) return;

  if (location.pathname.startsWith('/package/')) {
    if (!Array.isArray(packageList)) {
      packageList = await getPackageList();
    }

    const package = location.pathname.replace('/package/', '');

    $btn.classList.toggle('hidden', packageList.includes(package));
  } else {
    $btn.classList.add('hidden');
  }
}

/**
 *
 * @param {github | npm} type
 * @param { 配置列表 } configsList
 * @returns html
 */

function renderConfigPanle(type, configsList, configLocal) {
  return `
    <div class="panel ${type}">
      <h3>${type}</h3>
      <div class="list">
        ${configsList
          .map((config) => {
            return `
            <div class="item">
              <input
                data-type="${type}"
                type="checkbox"
                id="${type}-${config.value}" 
                name="${config.value}" 
                ${configLocal[config.value] ?? config.default ? 'checked' : ''} 
              />
              <label for="${type}-${config.value}">${config.label}</label>
            </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

const githubRegex = /github\.com[\/:]([^\/]+)\/([^\/.]+)(?:\.git)?$/;

function getGithubURL(pkg) {
  // 从包信息中尽量找到 github 的仓库地址，用来解析 作者 和 仓库名称
  return pkg.repository?.url || pkg.bugs.url.replace('/issues', '') || pkg.homepage;
}

function getAutor(githubURL) {
  const match = githubURL.match(githubRegex);
  if (match) {
    return match[1];
  }
  return null;
}

// 有的 npm 包名和仓库名并不是一致的
// 比如 git+https://github.com/archiverjs/node-zip-stream.git
// npm: zip-stream vs  github:node-zip-stream
// 所以在获取 github 相关图标时要用仓库名称
function getRepo(githubURL) {
  const match = githubURL.match(githubRegex);
  return match ? match[2] : null;
}

function generateNpmImg(config, pkg, isHtml = true) {
  if (typeof config.generateImg === 'function') {
    return config.generateImg(pkg, isHtml);
  }
  const imgURL = `https://flat.badgen.net/npm/${config.value}/${pkg.name}`;

  if (isHtml) {
    return `<img alt="${config.label}" src="${imgURL}" />`;
  }

  return `![${config.label}](${imgURL})`;
}

function generateGithubImg(config, pkg, isHtml = true) {
  if (typeof config.generateImg === 'function') {
    return config.generateImg(pkg);
  }
  const githubURL = getGithubURL(pkg);
  const imgURL = githubURL ? `https://flat.badgen.net/github/${config.value}/${getAutor(githubURL)}/${getRepo(githubURL) || pkg.name}` : '';

  if (isHtml) {
    return imgURL ? `<img alt="${config.label}" src="${imgURL}" />` : emptyHtml;
  }

  return imgURL ? `![${config.label}](${imgURL})` : emptyMarkdown;
}

function generateTitle(pkg, isHtml = true) {
  if (isHtml) {
    return `<div class="title">
    <a href="https://www.npmjs.com/package/${pkg.name}" target="_blank">${pkg.name}</a>
    <span class="delete" data-package="${pkg.name}">❌</span>
  </div>`;
  }

  return `[${pkg.name}](https://www.npmjs.com/package/${pkg.name})`;
}

function generateMarkdownTable(packagelist, npmList, githubList, isTransposed = false) {
  if (!Array.isArray(packagelist) || !Array.isArray(npmList) || !Array.isArray(githubList)) return;
  let markdown = '';

  if (isTransposed) {
    const badges = [
      ...npmList.map((v) => {
        v.__is_npm = true;
        return v;
      }),
      ...githubList,
    ];
    const header = `| package name | ${badges.map((config) => config.label).join('|')}  | \n`;
    markdown += header;
    markdown += `| --- | ${badges.map(() => '---').join('|')}  \n`;
    packagelist.forEach((pkg) => {
      markdown += `| ${generateTitle(pkg, false)} | ${badges
        .map((config) => {
          if (config.__is_npm) {
            return generateNpmImg(config, pkg, false);
          }
          return generateGithubImg(config, pkg, false);
        })
        .join('|')} | \n`;
    });
  } else {
    const header = `|  | ${packagelist.map((v) => generateTitle(v, false)).join('|')} | \n`;
    markdown += header;

    markdown += `| --- | ${packagelist.map(() => '---').join('|')}  \n`;

    npmList.forEach((config) => {
      markdown += `| ${config.label} | ${packagelist.map((pkg) => generateNpmImg(config, pkg, false)).join('|')} | \n`;
    });

    githubList.forEach((config) => {
      markdown += `| ${config.label} | ${packagelist.map((pkg) => generateGithubImg(config, pkg, false)).join('|')} | \n`;
    });
  }

  return markdown;
}

function generateHTMLTable(tableSelector, filterFunction) {
  const originalTable = document.querySelector(`#${containerId} table`);
  if (!originalTable) {
    return '';
  }

  const clonedTable = originalTable.cloneNode(true);

  const elementsToRemove = Array.from(clonedTable.querySelectorAll('.delete'));
  elementsToRemove.forEach((el) => el.remove());

  const tempContainer = document.createElement('div');
  tempContainer.appendChild(clonedTable);
  const htmlString = tempContainer.innerHTML;

  return htmlString;
}
