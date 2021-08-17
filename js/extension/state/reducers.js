/* eslint-disable */
/* REQUIREMENTS */
const assign = require('object-assign');
import { LOADED_DATA, LOAD_ERROR, UPDATE_STYLE_BTN, SET_LAYER_2_TJS, CLICK_TJS_BUTTON } from './actions';

/* REDUCERS CASE */
export default function(state = {datasetsModal: false}, action) {
    switch (action.type) {
        case LOADED_DATA:
            return assign({}, state, {
                text: action.payload
            });
        case LOAD_ERROR:
            return assign({}, state, {
                error: action.error
            });
        case UPDATE_STYLE_BTN:
            return assign({}, state, {
                style: action.style
            });
        case SET_LAYER_2_TJS:
            return assign({}, state, {
                layer2TJSSelected: action.layer2TJSSelected
            });
        case CLICK_TJS_BUTTON:
            return assign({}, state, {
                datasetsModal: !state.datasetsModal
            });
        default:
            return state;
    }
}
