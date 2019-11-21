
//input int id, str type, arr action
//call appropriate update function based on type
function updateEnt(id, type, action){
    if(type == "unit"){
        updateUnit(id, action);
    }
    if(type == "house"){
        updateHouse(id, action);
    }
    if(type == "cave"){
        updateCave(id, action);
    }
}

//input int id, arr action
//update ent list based on action
function updateUnit(id, action){
    entList[id].setAction(action[0], action[1])
}

//input int id, arr action
//update ent list based on action
function updateHouse(id, action){
    //update ent list with action
}

//input int id, arr action
//update ent list based on action
function updateCave(id, action){
    //update ent list with action
}