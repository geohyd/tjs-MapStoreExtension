/* eslint-disable */
// REQUIREMENTS //
import { get, post } from 'mapstore2/web/client/libs/ajax';
const ConfigUtils = require('mapstore2/web/client/utils/ConfigUtils');
const urlUtil = require('url');
const assign = require('object-assign');
const xml2js = require('xml2js');

const capabilitiesCache = {};

// FUNCTIONS //
const parseUrl = (url) => {
    const parsed = urlUtil.parse(url, true);
    return urlUtil.format(assign({}, parsed, {search: null}, {
        query: assign({
            service: "TJS",
            version: '1.0.0',
            request: "GetCapabilities"
        }, parsed.query)
    }));
};

/**
 * getCapabilities
 * return a promise of capabilities
 * @param {string} url
 */
const getCapabilities = function(url) {
    const cached = capabilitiesCache[url];
    if (cached && new Date().getTime() < cached.timestamp + (ConfigUtils.getConfigProp('cacheExpire') || 60) * 1000) {
        return new Promise((resolve) => {
            resolve(cached.response).then((response) => {return response;});
        });
    }
    const getCapabilitiesUrl = urlUtil.parse(url, true);
    return new Promise((resolve) => {
        resolve(get(parseUrl(getCapabilitiesUrl)).then((response) => {
            if ( response.status === 200 && ["No service: ( TJS )", "Service tjs is disabled"].some(el => response.data.includes(el)) ) {
                // No TJS available
                throw new Error(response.data, 'utils/TJS', 37);
            }
            capabilitiesCache[url] = {
                timestamp: new Date().getTime(),
                response: response
            };
            return response;
        })
        .catch((error) => {
            throw error;
        }));
    });
}

/**
 * describeFrameworks
 * return a promise of all Frameworks available
 * @param {string} url
 */
const describeFrameworks = function(url) {
    const parsed = urlUtil.parse(url, true);
    const describeFrameworksUrl = urlUtil.format(assign({}, parsed, {
        query: assign({
            request: "DescribeFrameworks"
        }, parsed.query)
    }));
    return new Promise((resolve) => {
        resolve(get(parseUrl(describeFrameworksUrl)).then((response) => {
            let json;
            xml2js.parseString(response.data, {explicitArray: false}, (ignore, result) => {
                json = result;
            });
            return json;
        })
        .catch((error) => {
            throw new Error(error, 'utils/TJS', 68);
        }));
    });
}

/**
 * describeDatasets
 * return a promise of all Frameworks available
 * @param {string} url
 */
const describeDatasets = function(url, frameworkURI) {
    const parsed = urlUtil.parse(url, true);
    const describeDatasetsUrl = urlUtil.format(assign({}, parsed, {
        query: assign({
            FrameworkURI: frameworkURI,
            request: "DescribeDatasets"
        }, parsed.query)
    }));
    return new Promise((resolve) => {
        resolve(get(parseUrl(describeDatasetsUrl)).then((response) => {
            let json;
            xml2js.parseString(response.data, {explicitArray: false}, (ignore, result) => {
                json = result;
            });
            return json;
        })
        .catch((error) => {
            throw new Error(error, 'utils/TJS', 95);
        }));
    });
}

/**
 * DescribeData
 * return a promise of all data column
 * @param {string} url
 */
const describeData = function(url, frameworkURI, datasetURI) {
    const parsed = urlUtil.parse(url, true);
    const describeDataUrl = urlUtil.format(assign({}, parsed, {
        query: assign({
            DatasetURI: datasetURI,
            FrameworkURI: frameworkURI,
            request: "DescribeData"
        }, parsed.query)
    }));
    return new Promise((resolve) => {
        resolve(get(parseUrl(describeDataUrl)).then((response) => {
            let json;
            xml2js.parseString(response.data, {explicitArray: false}, (ignore, result) => {
                json = result;
            });
            return json;
        })
        .catch((error) => {
            throw new Error(error, 'utils/TJS', 123);
        }));
    });
}


/**
 * getData
 * return a promise of all data column
 * @param {string} url
 */
const getData = function(url, frameworkURI, datasetURI, attributes) {
    const parsed = urlUtil.parse(url, true);
    const getDataUrl = urlUtil.format(assign({}, parsed, {
        query: assign({
            DatasetURI: datasetURI,
            FrameworkURI: frameworkURI,
            attributes: attributes,
            request: "GetData"
        }, parsed.query)
    }));
    return new Promise((resolve) => {
        resolve(get(parseUrl(getDataUrl)).then((response) => {
            let json;
            xml2js.parseString(response.data, {explicitArray: false}, (ignore, result) => {
                json = result;
            });
            return json;
        })
        .catch((error) => {
            throw new Error(error, 'utils/TJS', 153);
        }));
    });
}

/**
 * joinData
 * return a promise of the joinData
 * @param {string} url
 */
const joinData = function(url, frameworkURI, datasetURI, attributes, filter, style) {
    // XML post DATA
    var postDATA = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
        <JoinData service="TJS" version="1.0" language="en-CA" xmlns="http://www.opengis.net/tjs/1.0"\
                    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\
                    xsi:schemaLocation="http://www.opengis.net/tjs/1.0  http://schemas.opengis.net/tjs/1.0/tjsJoinData_request.xsd">\
            <AttributeData>\
                <GetDataURL>\
                    __GETDATA__\
                </GetDataURL>\
            </AttributeData>\
            __MAPSTYLE__\
        </JoinData>\
    ';
    var mapStyle = '<MapStyling>\
            <StylingIdentifier>SLD</StylingIdentifier>\
            <StylingURL>__STYLE__</StylingURL>\
        </MapStyling>\
    ';
    // URL management
    try {
        url = new URL(url);
        url = url.href;
    } catch (e) {
        url = window.location.origin + url;
    }

    const parsed = urlUtil.parse(url, true);
    var getDataUrl = urlUtil.format(assign({}, parsed, {
        query: assign({
            service: 'TJS',
            DatasetURI: datasetURI,
            FrameworkURI: frameworkURI,
            attributes: attributes.join(','),
            request: "GetData"
        },
        filter.FilterColumn ? { FilterColumn: filter.FilterColumn } : {},
        filter.FilterValue ? { FilterValue: filter.FilterValue } : {},
        parsed.query)
    }));
    getDataUrl = getDataUrl.replace(/&/g, "&amp;");
    postDATA = postDATA.replace(/__GETDATA__/g, getDataUrl);
    if (style) {
        mapStyle = mapStyle.replace(/__STYLE__/g, style);
    } else {
        mapStyle = "";
    }
    postDATA = postDATA.replace(/__MAPSTYLE__/g, mapStyle);
    return new Promise((resolve) => {
        resolve(post(url, postDATA, {headers: {'Content-Type': 'application/xml'}}).then((response) => {
            let json;
            xml2js.parseString(response.data, {explicitArray: false}, (ignore, result) => {
                json = result;
            });
            if (json['ows:ExceptionReport']) {
                throw new Error(JSON.stringify(json), 'utils/TJS', 215);
            }
            return json;
        })
        .catch((error) => {
            throw new Error(error, 'utils/TJS', 215);
        }));
    });
}

/**
 * API for local config
 */
var Api = {
    getCapabilities,
    describeFrameworks,
    describeDatasets,
    describeData,
    getData,
    joinData,
    reset: () => {
        Object.keys(capabilitiesCache).forEach(key => {
            delete capabilitiesCache[key];
        });
    }
};

export default Api;
