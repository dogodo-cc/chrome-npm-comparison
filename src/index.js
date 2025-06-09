/*
 * 由于在
 * https://www.npmjs.com/search?q=xxx 和 https://www.npmjs.com/package/xxx
 * 之间跳转不会重载页面，所以需要监听路由变化来重新更新视图
 */

["hashchange", "popstate"].forEach((event) => {
  window.addEventListener(event, () => {
    render();
  });
});

const btnId = "npm-comparison-add-btn-make-sure-unique";
const containerId = "npm-comparison-container-make-sure-unique";

// 数据来源： https://flat.badgen.net/npm
const npmBadgeConfigsList = [
  {
    label: "version",
    value: "v",
    default: true,
  },
  {
    label: "weekly download",
    value: "dw",
    default: true,
  },
  {
    label: "monthly download",
    value: "dm",
    default: false,
  },
  {
    label: "yearly download",
    value: "dy",
    default: false,
  },
  {
    label: "total download",
    value: "dt",
    default: false,
  },
  {
    label: "license",
    value: "license",
    default: true,
  },
  {
    label: "node version",
    value: "node",
    default: false,
  },
  {
    label: "dependents",
    value: "dependents",
    default: true,
  },
  {
    label: "types",
    value: "types",
    default: true,
  },
];

// 数据来源： https://flat.badgen.net/github
const githubBadgeConfigsList = [
  {
    label: "license",
    value: "license",
    default: false,
  },
  {
    label: "watchers",
    value: "watchers",
    default: false,
  },
  {
    label: "branches",
    value: "branches",
    default: false,
  },
  {
    label: "releases",
    value: "releases",
    default: false,
  },
  {
    label: "tags",
    value: "tags",
    default: false,
  },
  {
    label: "latest tag",
    value: "tag",
    default: false,
  },
  {
    label: "stars",
    value: "stars",
    default: true,
    generateImg(package) {
      // shields 的 stars 更美观
      if (package.repository?.url) {
        const autor = getAutor(package.repository.url);
        return `<img src="https://img.shields.io/github/stars/${autor}/${package.name}?color=white&label" />`;
      }
      return '<span title="empty repository">-</span>';
    },
  },
  {
    label: "forks",
    value: "forks",
    default: false,
  },
  {
    label: "commits count",
    value: "commits",
    default: false,
  },
  {
    label: "last commit",
    value: "last-commit",
    default: true,
  },
  {
    label: "issues",
    value: "issues",
    default: true,
  },
  {
    label: "open issues",
    value: "open-issues",
    default: true,
  },
  {
    label: "closed issues",
    value: "closed-issues",
    default: true,
  },
];

async function getStorage(area = "local", key, defaultValue) {
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

// 页面初始化
(async function () {
  initAddBtn();
  initPanle();
})();

async function getPackageList() {
  return getStorage("local", "packageList", []);
}

async function getNpmBadge() {
  return getStorage("sync", "npmBadge", {});
}

async function getGithubBadge() {
  return getStorage("sync", "githubBadge", {});
}

async function fetchPackageData(list) {
  const packageData = [];
  for (const packageName of list) {
    try {
      const response = await fetch(
        "https://registry.npmjs.org/" + decodeURIComponent(packageName)
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      packageData.push(data);
    } catch (error) {
      console.error("Error fetching data for package:", packageName, error);
    }
  }
  return packageData;
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

  const npmBadgeUser = await getNpmBadge();
  const npmBadgeConfigsListChecked = npmBadgeConfigsList.filter(
    (c) => npmBadgeUser[c.value] ?? c.default
  );

  const githubBadgeUser = await getGithubBadge();
  const githubBadgeConfigsListChecked = githubBadgeConfigsList.filter(
    (c) => githubBadgeUser[c.value] ?? c.default
  );

  const fragment = document.createDocumentFragment();
  const packageData = await fetchPackageData(list);
  packageData.forEach((pkg) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <a href="https://www.npmjs.com/package/${pkg.name}" target="_blank">${
      pkg.name
    }</a>
      </td>
      ${npmBadgeConfigsListChecked
        .map(
          (config) =>
            `<td><img src="https://flat.badgen.net/npm/${config.value}/${pkg.name}" /></td>`
        )
        .join("")}
        ${githubBadgeConfigsListChecked
          .map((config) => `<td>${generateGithubImg(config, pkg)}</td>`)
          .join("")}  
    `;
    fragment.appendChild(row);
  });

  container.innerHTML = `
  <table>
      <thead>
          <tr>
              <th>Package Name</th>
             ${[...npmBadgeConfigsListChecked, ...githubBadgeConfigsListChecked]
               .map((config) => `<th>${config.label}</th>`)
               .join("")}
          </tr>
      </thead>
      <tbody></tbody>
  </table>
  `;
  container.querySelector("tbody").appendChild(fragment);

  console.log("Package Data:", packageData);
}

function initAddBtn() {
  const $btn = document.createElement("div");
  $btn.id = btnId;
  $btn.textContent = "Add to npm Comparison";
  document.querySelector("#main h2").appendChild($btn);
  $btn.addEventListener("click", async () => {
    const list = await getPackageList();
    const package = location.pathname.replace("/package/", "");
    if (!list.includes(package)) {
      list.push(package);
      chrome.storage.local.set({ packageList: list }, () => {
        render(list);
      });
    }
  });
}

async function initPanle() {
  const $panel = document.createElement("div");
  $panel.id = containerId;

  const npmConfig = await getNpmBadge();
  const githubConfig = await getGithubBadge();

  $panel.innerHTML = `
    <section class="header">
      <details>
        <summary></summary>
        ${renderConfigPanle("npm", npmBadgeConfigsList, npmConfig)}
        ${renderConfigPanle("github", githubBadgeConfigsList, githubConfig)}
      </details>
    </section>
    <section class="body">
    </section>
  `;

  $panel.addEventListener(
    "change",
    async (e) => {
      const type = e.target.dataset.type;
      if (!/(npmBadge)|(githubBadge)/.test(type)) return;

      const badge = e.target.name;
      const value = e.target.checked;

      const _data = await getStorage("sync", type, {});
      Object.assign(_data, { [badge]: value });

      chrome.storage.sync.set({ [type]: _data }, () => {
        render();
      });
    },
    false
  );

  document.body.appendChild($panel);

  // 初始化好 DOM 结构的时候进行一次界面更新
  render();
}

// 更新按钮的可见性
async function toggleAddBtnHidden(packageList) {
  const $btn = document.getElementById(btnId);
  if (!$btn) return;

  if (location.pathname.startsWith("/package/")) {
    if (!Array.isArray(packageList)) {
      packageList = await getPackageList();
    }

    const package = location.pathname.replace("/package/", "");

    $btn.classList.toggle("hidden", packageList.includes(package));
  } else {
    $btn.classList.add("hidden");
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
                data-type="${type === "github" ? "githubBadge" : "npmBadge"}"
                type="checkbox"
                id="${type}-${config.value}" 
                name="${config.value}" 
                ${configLocal[config.value] ?? config.default ? "checked" : ""} 
              />
              <label for="${type}-${config.value}">${config.label}</label>
            </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

const regex = /github\.com[\/:]([^\/]+)/i;
function getAutor(githubURL) {
  const match = githubURL.match(regex);
  if (match) {
    return match[1];
  }
}

function generateGithubImg(config, pkg) {
  if (typeof config.generateImg === "function") {
    return config.generateImg(pkg);
  } else {
    if (pkg.repository?.url) {
      return `<img src="https://flat.badgen.net/github/${
        config.value
      }/${getAutor(pkg.repository.url)}/${pkg.name}" />`;
    }
    return '<span title="empty repository">-</span>';
  }
}
