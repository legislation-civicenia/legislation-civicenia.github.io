import Fuse from './fuse.js';
import {Hit, Page} from './types.js';

const JSON_INDEX_URL = `${window.location.origin}/index.json`;
const QUERY_URL_PARAM = 'query';

const MAX_HITS_SHOWN = 100;

const LEFT_SIDE_MATCH_HTML = '<span style="background-color: #efefef;">';
const RIGHT_SIDE_MATCH_HTML = '</span>';
const FUSE_OPTIONS = {
  keys: ['title', 'type', 'status'],
  ignoreLocation: true,
  includeMatches: true,
  useExtendedSearch: true,
  minMatchCharLength: 3
};

let fuse: any;

const getInputEl = (): HTMLInputElement => {
  return document.querySelector('#search_input');
};

const enableInputEl = (): void => {
  getInputEl().disabled = false;
};

const initFuse = (pages: Page[]): void => {
  const startTime = performance.now();
  fuse = new Fuse(pages, FUSE_OPTIONS);
};

const doSearchIfUrlParamExists = (): void => {
  const urlParams = new URLSearchParams(window.location.search);
  let query : any;
  if (urlParams.has(QUERY_URL_PARAM)) {
    query = decodeURIComponent(urlParams.get(QUERY_URL_PARAM));
  }
  else{
    query = " ";
  }
  getInputEl().value = query;
  handleSearchEvent();
};

const setUrlParam = (query: string): void => {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set(QUERY_URL_PARAM, encodeURIComponent(query));
  window.history.replaceState({}, '', `${location.pathname}?${urlParams}`);
};

const fetchJsonIndex = (): void => {
  const startTime = performance.now();
  fetch(JSON_INDEX_URL)
    .then(response => {
      return response.json();
    })
    .then(data => {
      const pages: Page[] = data;
      initFuse(pages);
      enableInputEl();
      doSearchIfUrlParamExists();
    })
    .catch(error => {
      console.error(`Failed to fetch JSON index: ${error.message}`);
    });
};

const highlightMatches = (hit: Hit, key: string) => {
  const text: string = hit.item[key];
  const match = hit.matches.find(match => match.key === key);

  if (!match) {
    return text;
  }

  const charIndexToReplacementText = new Map<number, string>();

  match.indices.forEach(indexPair => {
    const startIndex = indexPair[0];
    const endIndex = indexPair[1];

    const startCharText = `${LEFT_SIDE_MATCH_HTML}${text[startIndex]}`;
    const endCharText = `${text[endIndex]}${RIGHT_SIDE_MATCH_HTML}`;

    charIndexToReplacementText.set(startIndex, startCharText);
    charIndexToReplacementText.set(endIndex, endCharText);
  });

  return text
    .split('')
    .map((char, index) => charIndexToReplacementText.get(index) || char)
    .join('');
};

const createHitHtml = (hit: Hit): string => {
  const details = Object.keys(hit.item)
    .filter(key => {
      return key !== 'title' && key !== 'url';
    })
    .map(key => {
      return `\
    <strong>${key}:</strong> ${highlightMatches(hit, key)}<br>
    `;
    })
    .join('\n');

  return `\
  <p>
    <a href="${hit.item.url}">
    ${highlightMatches(hit, 'title')}
    </a><br>
    ${details}
  </p>`;
};

const renderHits = (hits: Hit[]): void => {
  const limitedHits = hits.slice(0, MAX_HITS_SHOWN);
  const html = limitedHits.map(createHitHtml).join('\n');
  document.querySelector('#search_results_container').innerHTML = html;
};

const getQuery = (): string => {
  const query = getInputEl().value.trim();
  return query;
};

const getHits = (query: string): Hit[] => {
  let results = fuse.search(query);
  if(!results.length && query.length < 3){
    results = fuse.search("!0123456789abcd");
  }
  return results;
};

const handleSearchEvent = (): void => {
  const startTime = performance.now();
  const query = getQuery();
  const hits = getHits(query);
  setUrlParam(query);
  renderHits(hits);
};

const handleDOMContentLoaded = (): void => {
  if (getInputEl()) {
    fetchJsonIndex();
    getInputEl().addEventListener('keyup', handleSearchEvent);
  }
};

const main = (): void => {
  document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
};

main();