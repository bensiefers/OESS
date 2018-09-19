document.addEventListener('DOMContentLoaded', function() {
  let addEntitySubmit = document.querySelector('#add-entity-submit');
  addEntitySubmit.addEventListener('click', addEntitySubmitCallback);

  let addEntityCancel = document.querySelector('#add-entity-cancel');
  addEntityCancel.addEventListener('click', addEntityCancelCallback);

  let addInterfaceSubmit = document.querySelector('#add-endpoint-submit');
  addInterfaceSubmit.addEventListener('click', addInterfaceSubmitCallback);

  let addInterfaceCancel = document.querySelector('#add-endpoint-cancel');
  addInterfaceCancel.addEventListener('click', addInterfaceCancelCallback);

  let endpointInterfaceSelect = document.querySelector('#endpoint-select-interface');
  endpointInterfaceSelect.addEventListener('change', loadInterfaceVLANs);
  endpointInterfaceSelect.addEventListener('change', loadInterfaceCloudAccountInput);
});

async function showEndpointSelectionModal(endpoint, options) {
    console.log(endpoint);
    console.log(options);

    // Clear all pre-existing values from form
    document.querySelector('#entity-index').value = null;
    document.querySelector('#entity-id').value = null;
    document.querySelector('#entity-name').value = null;
    document.querySelector('#entity-node').value = null;
    document.querySelector('#entity-interface').value = null;
    document.querySelector('#endpoint-vlans').value = null;
    document.querySelector('#entity-vlans').value = null;
    document.querySelector('#endpoint-bandwidth').value = null;
    document.querySelector('#entity-bandwidth').value = null;
    document.querySelector('#endpoint-cloud-account-id').value = null;
    document.querySelector('#entity-cloud-account-id').value = null;

    if (endpoint) {
        document.querySelector('#endpoint-select-header').innerHTML = 'Modify Network Endpoint';

        if ('entity_id' in endpoint && endpoint.entity_id !== -1) {
            $('#basic').tab('show');

            await loadEntities(endpoint.entity_id, options);
            await loadInterfaces();

            document.querySelector('#entity-index').value = endpoint.index;
            document.querySelector('#entity-id').value = endpoint.entity_id;
            document.querySelector('#entity-name').value = endpoint.entity;

            document.querySelector('#entity-node').value = endpoint.node;
            document.querySelector('#entity-interface').value = endpoint.interface;

            loadEntityVLANs();
        } else {
            $('#advanced').tab('show');

            await loadEntities();
            await loadInterfaces();
            await loadInterfaceVLANs();

            // #entity-index is shared between interfaces and entities
            document.querySelector('#endpoint-select-interface').value = `${endpoint.node} - ${endpoint.interface}`;
            document.querySelector('#entity-index').value = endpoint.index;

            // Must call after endpoint-select-interface's value set
            await loadInterfaceCloudAccountInput();
        }

        document.querySelector('#endpoint-vlans').value = endpoint.tag;
        document.querySelector('#entity-vlans').value = endpoint.tag;

        document.querySelector('#endpoint-bandwidth').value = endpoint.bandwidth;
        document.querySelector('#entity-bandwidth').value = endpoint.bandwidth;

        document.querySelector('#add-endpoint-submit').innerHTML = 'Modify Interface';
        document.querySelector('#add-entity-submit').innerHTML = 'Modify Entity';

        document.querySelector('#endpoint-cloud-account-id').value = endpoint.cloud_account_id;

        let addEntitySubmitButton = document.querySelector('#add-entity-submit');
        addEntitySubmitButton.innerHTML = `Modify Endpoint`;


    } else {
        document.querySelector('#endpoint-select-header').innerHTML = 'Add Network Endpoint';

        loadEntities();
        loadEntityVLANs();

        await loadInterfaces();
        loadInterfaceVLANs();
        loadInterfaceCloudAccountInput();

        document.querySelector('#entity-index').value = -1;
    }

    let endpointSelectionModal = $('#add-endpoint-modal');
    endpointSelectionModal.modal('show');
}

async function showAndPrePopulateEndpointSelectionModal(entity_id) {
    await loadEntities(entity_id);
    loadEntityVLANs();

    document.querySelector('#entity-index').value = -1;
    document.querySelector('#entity-bandwidth').value = null;

    let endpointSelectionModal = $('#add-endpoint-modal');
    endpointSelectionModal.modal('show');
}


async function hideEndpointSelectionModal(index) {
    let endpointSelectionModal = $('#add-endpoint-modal');
    endpointSelectionModal.modal('hide');
}

async function loadEntities(parentEntity=null, options) {
    let entity = await getEntities(session.data.workgroup_id, parentEntity, options);

    let parent = null;
    if ('parents' in entity && entity.parents.length > 0) {
        parent = entity.parents[0];
    }

    let entities = '';
    let spacer = '';

    if (parent) {
        entities += `<button type="button" class="list-group-item active" onclick="loadEntities(${parent.entity_id})">
                       <span class="glyphicon glyphicon-menu-up"></span>&nbsp;&nbsp;
                       ${entity.name}
                     </button>`;
        spacer = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
    }

    if ('children' in entity && entity.children.length > 0) {
        entity.children.forEach(function(child) {
                entities += `<button type="button" class="list-group-item" onclick="loadEntities(${child.entity_id})">
                               ${spacer}${child.name}
                               <span class="glyphicon glyphicon-menu-right" style="float: right;"></span>
                             </button>`;
        });
    }

    // Once the user has selected a leaf entity it's expected that we
    // Display all its associated ports.
    if ('children' in entity && entity.children.length === 0) {
        entity.interfaces.forEach(function(child) {
                entities += `<button type="button" class="list-group-item"
                                     onclick="setEntityEndpoint(${entity.entity_id}, '${entity.name}', '${child.node}', '${child.name}')">
                               ${spacer}<b>${child.node}</b> ${child.name}
                             </button>`;
        });
    }

    let entityList = document.querySelector('#entity-list');
    entityList.innerHTML = entities;

    setEntity(entity.entity_id, entity.name);
    loadEntityVLANs(entity);
    loadEntityCloudAccountInput(entity);
}

async function loadEntityVLANs(entity) {
    if (!entity) {
        console.log('skipping entity vlan fetch');
        return null;
    }

    let vlanH = {};
    for (let i = 0; i < entity.interfaces.length; i++) {
        for (let j = 0; j < entity.interfaces[i].available_vlans.length; j++) {
            vlanH[entity.interfaces[i].available_vlans[j]] = 1;
        }
    }

    let vlans = [];
    for (key in vlanH) {
        vlans.push(key);
    }

    let options = '';
    for (let i = 0; i < vlans.length; i++) {
        options += `<option>${vlans[i]}</option>`;
    }
    document.querySelector('#entity-vlans').innerHTML = options;
}

async function loadEntityCloudAccountInput(entity) {
    console.log('loading entity account');
    console.log(entity);
    if (!entity) {
        console.log('skipping entity account');
        return null;
    }

    let interconnect_id = null;
    let interconnect_type = null;

    for (let i = 0; i < entity.interfaces.length; i++) {
        if (typeof entity.interfaces[i].cloud_interconnect_id === 'undefined' || entity.interfaces[i].cloud_interconnect_id === '') {
            continue;
        }

        interconnect_id = entity.interfaces[i].cloud_interconnect_id;
        interconnect_type = entity.interfaces[i].cloud_interconnect_type;
    }

    if (interconnect_id === null || interconnect_id === 'null' || interconnect_id === '') {
        document.querySelector('#entity-cloud-account').style.display = 'none';
    } else {
        // TODO Update cloud account label based on interconnect type
        document.querySelector('#entity-cloud-account-label').innerHTML = 'AWS Account Owner';
        document.querySelector('#entity-cloud-account').style.display = 'block';
    }
}

async function addEntitySubmitCallback(event) {
    let name = document.querySelector('#entity-name').value;
    if (name === '') {
        document.querySelector('#entity-alert').style.display = 'block';
        return null;
    }

    if (!document.querySelector('#entity-bandwidth').validity.valid) {
        document.querySelector('#entity-bandwidth').reportValidity();
        return null;
    }

    let entity = {
        bandwidth: document.querySelector('#entity-bandwidth').value,
        interface: "TBD",
        node: "TBD",
        name: "TBD",
        peerings: [],
        tag: document.querySelector('#entity-vlans').value,
        entity_id: document.querySelector('#entity-id').value,
        entity: document.querySelector('#entity-name').value,
        cloud_account_id: document.querySelector('#entity-cloud-account-id').value
    };

    console.log(entity);

    let endpoints = JSON.parse(sessionStorage.getItem('endpoints'));
    let endpointIndex = document.querySelector('#entity-index').value;
    if (endpointIndex >= 0) {
        entity.peerings = endpoints[endpointIndex].peerings;
        endpoints[endpointIndex] = entity;
    } else {
        endpoints.push(entity);
    }

    sessionStorage.setItem('endpoints', JSON.stringify(endpoints));
    loadSelectedEndpointList();

    let entityAlert = document.querySelector('#entity-alert');
    entityAlert.innerHTML = '';
    entityAlert.style.display = 'none';
    let entityAlertOK = document.querySelector('#entity-alert-ok');
    entityAlertOK.innerHTML = '';
    entityAlertOK.style.display = 'none';

    let addEndpointModal = $('#add-endpoint-modal');
    addEndpointModal.modal('hide');
}

async function addEntityCancelCallback(event) {
    let entityAlert = document.querySelector('#entity-alert');
    entityAlert.innerHTML = '';
    entityAlert.style.display = 'none';
    let entityAlertOK = document.querySelector('#entity-alert-ok');
    entityAlertOK.innerHTML = '';
    entityAlertOK.style.display = 'none';

    let addEndpointModal = $('#add-endpoint-modal');
    addEndpointModal.modal('hide');
}



async function setEntity(id, name) {
   let entityID = document.querySelector('#entity-id');
   entityID.value = id;

   let entityName = document.querySelector('#entity-name');
   entityName.value = name;
}

async function setEntityEndpoint(id, name, node, intf) {
    document.querySelector('#entity-id').value = id;
    document.querySelector('#entity-name').value = name;
    document.querySelector('#entity-node').value = node;
    document.querySelector('#entity-interface').value = intf;
}



// --- Interfaces ---



async function loadInterfaces() {
    let interfaces = await getInterfacesByWorkgroup(session.data.workgroup_id);

    let options = '';
    interfaces.forEach(function(intf) {
            options += `<option data-entity="${intf.entity}" data-entity="${intf.entity_id}" data-id="${intf.interface_id}" data-cloud-interconnect-id="${intf.cloud_interconnect_id}" data-cloud-interconnect-type="${intf.cloud_interconnect_type}" data-node="${intf.node}" data-interface="${intf.name}" value="${intf.name} - ${intf.name}">
                          ${intf.node} - ${intf.name}
                        </option>`;
    });
    document.querySelector('#endpoint-select-interface').innerHTML = options;

    loadInterfaceVLANs();
}

async function loadInterfaceVLANs() {
    console.log('loading interface vlans');

    let select = document.querySelector('#endpoint-select-interface');
    if (!select.value) {
        return null;
    }

    let id = select.options[select.selectedIndex].getAttribute('data-id');

    let vlans = await getAvailableVLANs(session.data.workgroup_id, id);
    let options = '';
    for (let i = 0; i < vlans.length; i++) {
        options += `<option>${vlans[i]}</option>`;
    }
    document.querySelector('#endpoint-vlans').innerHTML = options;
}

async function loadInterfaceCloudAccountInput() {
    console.log('loading interface cloud account input');

    let select = document.querySelector('#endpoint-select-interface');
    if (!select.value) {
        return null;
    }

    let id = select.options[select.selectedIndex].getAttribute('data-id');
    let interconnect_id = select.options[select.selectedIndex].getAttribute('data-cloud-interconnect-id');
    let interconnect_type = select.options[select.selectedIndex].getAttribute('data-cloud-interconnect-type');

    if (interconnect_id === 'null') {
        document.querySelector('#endpoint-cloud-account').style.display = 'none';
    } else {
        // TODO Update cloud account label based on interconnect type
        document.querySelector('#endpoint-cloud-account-label').innerHTML = 'AWS Account Owner';
        document.querySelector('#endpoint-cloud-account').style.display = 'block';
    }
}

async function addInterfaceSubmitCallback(event) {
    let select = document.querySelector('#endpoint-select-interface');
    let node = select.options[select.selectedIndex].getAttribute('data-node');
    let intf = select.options[select.selectedIndex].getAttribute('data-interface');
    let entity = select.options[select.selectedIndex].getAttribute('data-entity');
    let entity_id = select.options[select.selectedIndex].getAttribute('data-entity_id');
    if(entity == "undefined" || entity == "" || entity == null || entity == undefined){
        entity = "NA";
    }
    let endpoint = {
        bandwidth: document.querySelector('#endpoint-bandwidth').value,
        name: intf,
        node: node,
        entity: entity,
        entity_id: entity_id,
        peerings: [],
        cloud_account_id: document.querySelector('#endpoint-cloud-account-id').value,
        tag: document.querySelector('#endpoint-vlans').value
    };
    console.log(endpoint);

    let endpoints = JSON.parse(sessionStorage.getItem('endpoints'));
    let endpointIndex = document.querySelector('#entity-index').value;
    if (endpointIndex >= 0) {
        endpoint.peerings = endpoints[endpointIndex].peerings;
        endpoints[endpointIndex] = endpoint;
    } else {
        endpoints.push(endpoint);
    }

    sessionStorage.setItem('endpoints', JSON.stringify(endpoints));
    loadSelectedEndpointList();

    let addEndpointModal = $('#add-endpoint-modal');
    addEndpointModal.modal('hide');
}

async function addInterfaceCancelCallback(event) {
    let addEndpointModal = $('#add-endpoint-modal');
    addEndpointModal.modal('hide');
}
