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

// 页面初始化
(async function () {
  initAddBtn();
  render();
})();

async function getPackageList() {
  return new Promise((resolve) => {
    chrome.storage.local.get("packageList", (result) => {
      if (chrome.runtime.lastError) {
        resolve([]);
      } else {
        resolve(result.packageList || []);
      }
    });
  });
}

async function fetchPackageData(list) {
  const packageData = [];
  for (const packageName of list) {
    try {
      const response = await fetch("https://registry.npmjs.org/" + packageName);
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

  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
  } else {
    // 下面会直接覆盖，不用提前清空，导致页面闪烁，体验不佳
    // container.innerHTML = "";
  }

  // 更新表格的可见性
  container.classList.toggle("hidden", list.length === 0);

  if (!list.length) return;

  const packageData = await fetchPackageData(list);

  container.innerHTML = `
    <table>
        <caption>
            Front-end web developer course 2021
        </caption>
        <thead>
            <tr>
                <th>Package Name</th>
                <th>Version</th>
                <th>Description</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody></tbody>
    </table>
    `;
  const tbody = container.querySelector("tbody");
  packageData.forEach((pkg) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><a href="https://www.npmjs.com/package/${pkg.name}" target="_blank">${
      pkg.name
    }</a></td>
      <td>${pkg["dist-tags"]?.latest || "N/A"}</td>
      <td>${pkg.description || "No description available"}</td>
      <td>${new Date(
        pkg.time?.modified || pkg.time?.created || Date.now()
      ).toLocaleDateString()}</td>
    `;
    tbody.appendChild(row);
  });

  document.body.appendChild(container);

  console.log("Package Data:", packageData);
}

function initAddBtn() {
  const $btn = document.createElement("div");
  $btn.id = btnId;
  $btn.textContent = "Add to npm Comparison";
  document.body.appendChild($btn);
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
