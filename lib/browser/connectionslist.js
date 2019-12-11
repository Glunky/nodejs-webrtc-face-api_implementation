"use strict";

function createConnectionsList(onUpload, onBroadcast) {
  const container = document.createElement("div");
  container.className = "connections-list";

  const uploadButton = document.createElement("button");
  uploadButton.innerText = "Upload";

  const list = document.createElement("ul");

  const listHeader = document.createElement("p");
  listHeader.innerText = "Active connections:";

  container.appendChild(listHeader);
  container.appendChild(uploadButton);
  container.appendChild(list);

  document.body.appendChild(container);

  let listElements = [];
  uploadButton.addEventListener("click", async () => {
    uploadButton.disabled = true;
    listElements.forEach(element => {
      list.removeChild(element);
    });
    listElements = [];
    try {
      const connections = await onUpload();
      connections.forEach(connection => {
        const listElement = document.createElement("li");
        listElement.className = "connections-list-element";

        const broadcastRefecence = document.createElement("button");
        broadcastRefecence.className = "broadcast-connection-button";
        broadcastRefecence.innerText = `${connection}`;
        broadcastRefecence.addEventListener("click", async () => {
          await onBroadcast(connection);
        });

        listElement.appendChild(broadcastRefecence);
        list.appendChild(listElement);

        listElements.push(listElement);
      });
      uploadButton.disabled = false;
    } catch (error) {
      uploadButton.disabled = false;
      throw error;
    }
  });
}

module.exports = createConnectionsList;
