import APIKEY from './apikey.js';

// Globals
const ENDPOINT = 'https://api.rawg.io/api';
let _challenges = [];
const modal = document.querySelector('dialog');
let previousYESEventHandler;
const selectEl = document.getElementById('game');

function setupModalHide() {
    const cancelElements = [document.querySelector('.close'), document.querySelector('#modal-no'), document.querySelector('#modal-cancel')];

    cancelElements.forEach(el => {
        if (el)
            el.addEventListener('click', () => { modal.close(); });        
    });

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function ({target}) {
        if (target == modal)
            modal.close();
    }
}

function formAddChallengeSubmit()
{
    document.getElementById('formAddChallenge').addEventListener('submit', function (e) {
        e.preventDefault();
        const form = e.target;
        if (form.reportValidity())   
            form.reset();
    });
}

function formSearchSubmit() {
    document.getElementById('formSearch').addEventListener('submit', function (e) { e.preventDefault(); });
}

function btnSearchGamesClick() {
    const el = document.getElementById('formSearch').querySelector('button[type="submit"]');
    el.addEventListener('click', (e) => {
        if (e.target.form.checkValidity())
            search();
    });
}

function btnAddChallengeClick() {    
    const el = document.getElementById('formAddChallenge').querySelector('button[type="submit"]');
    el.addEventListener('click', (e) => {
        if (e.target.form.checkValidity())
            addFromFormAndRefresh();
    });
}

function addBtnClearClickHandler() {
    const el = document.querySelector('#btn_clear');
    el.addEventListener('click', (e) => {
        const modalOK = () => { clearLocalStorage(); redrawItems() };
        modalConfirm('Really clear ALL challenges? (note: refreshing page directly after a reset re-adds test-data again)', modalOK);
    });
}

function modalConfirm(title, YESFunction) {
    const modalTitleEl = document.getElementById('modal-title');
    modalTitleEl.innerHTML = title;

    const btnEl = document.getElementById('modal-button');

    //If we have opened the modal and assigned a click event before to the YES-button. We must first remove it. Else there will be multiple click events if we add another.
    if(previousYESEventHandler)
        btnEl.removeEventListener('click', previousYESEventHandler)

    const eventHandler = (e) => {
        YESFunction();
        modal.close();
    };

    previousYESEventHandler = eventHandler;

    btnEl.addEventListener('click', eventHandler);
    modal.showModal();
}

function clearLocalStorage() {
    localStorage.clear();
    _challenges = [];
}

// Used by AddChallenge
function addFromFormAndRefresh() {
    const aName = document.getElementById('challengeName').value.trim();
    const aGameid = selectEl.value;    
    const aGameName = selectEl.options[selectEl.selectedIndex].text;
    addChallenge(createChallenge({ name: aName, gameid: aGameid, gamename: aGameName, status: false }));
    redrawItems();
}

async function fetchGames(searchQuery) {
    try {
        const url = new URL(ENDPOINT + '/games');
        url.searchParams.set('key', APIKEY);
        url.searchParams.set('platforms', '49');
        url.searchParams.set('search', searchQuery);    
        
        const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
        
        // const resp = await fetch(url.toString(), {
        //         headers: {
        //           'Access-Control-Allow-Origin': '*',
        //         mode: 'no-cors'  
        // }});
        
        if (!resp.ok)
            throw new Error(`Error:  ${resp.status}`);

        return await resp.json();
    } catch (e) {
        const modalOK = () => { search(); };
        modalConfirm(`<p class="flow">Searching RAWG did not succeed:</p>
            <details class="flow">
            <summary>Error message</summary>
            <p>${e}</p>
            </details>
            Do you want to retry?`, modalOK);
        return null;
    }
}

// Used by SearchGames
async function search() {
    /* https://api.rawg.io/api/games */
    const myJSON = await fetchGames(encodeURIComponent(document.getElementById('searchName').value.trim()));
    if(myJSON !== null)
        redrawSearchItems(myJSON.results);
}

const challengePrototype = {
    id: '',
    name: '',
    gameid: '-1',
    gamename: 'Okänt Spelnamn',
    status: false
};

function addTestItems() {
    addChallenge(createChallenge({ name: 'No game overs in Zelda 2', gameid: '53205', gamename: 'Zelda II: The Adventure of Link', status: false }));
    addChallenge(createChallenge({ name: 'Any% speedrun below 9m 12s 150ms in metroid', gameid: '24138', gamename: 'Metroid', status: false }));
}

function createChallenge({ name, gameid, gamename, status }) {
    const challenge = Object.create(challengePrototype);
    const id = self.crypto.randomUUID();
    challenge.id = id;
    challenge.name = name;
    challenge.gameid = gameid;
    challenge.gamename = gamename;
    challenge.status = status;
    return challenge;
}

function redrawItems() {   
    const el = document.getElementById('challengeList');
    el.innerHTML = '';

    const distinctGameids = [...new Set(_challenges.map(e => e.gameid))];

    distinctGameids.forEach(e => {
        createHTML(el, _challenges.filter(a => a.gameid === e));
    });
}

function refreshOptions() {
    selectEl.innerHTML = '';

    const distinctGameids = new Set(_challenges.map(e => e.gameid));
    const distinctGames = _challenges.filter(a => distinctGameids.has(a.gameid));

    distinctGames.forEach(e => {
        createOPTIONS(e);
    });
}

function redrawSearchItems(games) {
    const el = document.getElementById('gameList');
    el.innerHTML = '';

    games.forEach(e => {
        el.appendChild(createHTMLSearchItem(e));
    });
}

function createHTMLSearchItem(e)
{
    const div = document.createElement('article');
    div.classList.add('card');
    div.innerHTML =`<h3 class="card-title">
                        ${e.name}
                    </h3>
                    <figure class="card-photo">
                        <img src="${e.background_image}" alt="${e.name} Box Art">
                    </figure>
                    <p class="card-text">Release date: ${e.released}</p>
                    <section class="card-addbutton">                        
                    </section>`;
    
    const button = document.createElement('button');
    button.classList.add('button-20');
    button.innerText = 'Add Game';
    button.addEventListener('click', (clickevent) => {
        const newOption = { gameid: e.id, gamename: e.name };
        //if option does not exist in selectEl, then create it
        if (!Array.from(selectEl.options).some(option => option.text === newOption.gamename))
            createOPTIONS(newOption);

        selectOPTION(e.id);
    });

    const buttonSection = div.querySelector('.card-addbutton');
    buttonSection.appendChild(button);

    return div;
}

function createHTML(parent, filteredChallenges) {
    const [{ gamename }] = filteredChallenges;
    const sortedChallenges = [...filteredChallenges];
    sortedChallenges.sort((a, b) => {
        return a.name.localeCompare(b.name, 'sv');
    });

    const h2 = document.createElement('h2');
    h2.innerHTML = gamename;
    parent.appendChild(h2);

    const ul = parent.appendChild(document.createElement('ul'));
    ul.classList.add('flow');

    sortedChallenges.forEach(a => {
        ul.appendChild(createHTMLChallenge(a));
    });
}

function createOPTIONS({ gameid, gamename }) {
    const option = document.createElement('option');
    option.innerHTML = gamename;
    option.value = gameid;

    selectEl.appendChild(option);
}

function selectOPTION(gameid) {   
    selectEl.value = gameid;
    selectEl.setCustomValidity('');
    selectEl.focus();
}

function createHTMLChallenge({ status: challengeStatus, id: challengeId, name: challengeName }) {
    const pLi = document.createElement('li');
    
    const pCb = document.createElement('input');
    pCb.setAttribute('type', 'checkbox');
    pCb.checked = challengeStatus;
    pCb.addEventListener('change', (e) => { updateChallenge(challengeId, e.target.checked); }); //no redraw needed

    const pDel = document.createElement('input');
    pDel.setAttribute('type', 'button');
    pDel.setAttribute('title', 'Delete');
    pDel.classList.add('material-symbols-outlined');
    pDel.value = 'delete';
    pDel.addEventListener('click', () => {
        const modalOK = () => { removeChallenge(challengeId); redrawItems() };
        modalConfirm(`Really delete challenge? ${challengeName}`, modalOK);
    });
    
    const pEl = document.createElement('p');
    pEl.innerHTML = challengeName;
    
    pLi.appendChild(pCb);        
    pLi.appendChild(pEl);
    pLi.appendChild(pDel);       
    return pLi;
}

function removeChallenge(id) {
    _challenges.splice(_challenges.findIndex(e => e.id === id), 1);

    // Save changes in localstorage
    setALocalStorage(_challenges);
}

function updateChallenge(id, status) {
    // Update the array in place
    _challenges.forEach((a, index) => {
        if (a.id === id)
            _challenges[index] = { ...a, status: status };
    });

    //Save changes in localstorage
    setALocalStorage(_challenges);
}

function addChallenge(challenge) {
    _challenges.push(challenge);

    // Save changes in localstorage
    setALocalStorage(_challenges);
}

function setALocalStorage(challenges) {
    localStorage.setItem('ChallengeSave', JSON.stringify(challenges));
}

function InvalidMsg(textbox) {
    if (textbox.selectedIndex === -1)
        textbox.setCustomValidity('First search for a game to add!');
    else
        textbox.setCustomValidity('');
} 


function customInvalidSelector() {   
    selectEl.addEventListener('invalid', function () { InvalidMsg(this) });
    selectEl.addEventListener('input', function () { this.setCustomValidity(''); });     
}

// Main thread program
init(true);
function init(_isDevelopment) {
    customInvalidSelector(); 
    btnAddChallengeClick();
    btnSearchGamesClick();    
    addBtnClearClickHandler();
    setupModalHide();
    formAddChallengeSubmit();
    formSearchSubmit();

    const parseChallengeJSONAsChallenge = function (jsonChallenge) {
        const newChallenge = Object.create(challengePrototype);
        Object.assign(newChallenge, jsonChallenge);
        return newChallenge;
    }

    //If this is first time visiting
    if (localStorage.getItem('ChallengeSave') == null) {
        if (_isDevelopment)
            addTestItems(); //This one save to setALocalStorage anyway
        else
            setALocalStorage(_challenges); //This is probably just a empty array but futureproofing logic incase it isn't anyone, we don't want null there anymore
    }
    else {
        //We are a returning visitor and want to load (Load/Parse _challenges from localStorage)
        const jsonFromStorage = localStorage.getItem('ChallengeSave');
        const objFromJSON = JSON.parse(jsonFromStorage);
        _challenges = objFromJSON.map(parseChallengeJSONAsChallenge);
    }
    redrawItems();
    refreshOptions();
}