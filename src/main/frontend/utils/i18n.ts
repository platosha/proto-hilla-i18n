import { translate as origTranslate } from "@vaadin/hilla-react-i18n";
import {i18nKeys} from "Frontend/to-be-generated/i18n-keys";

export function translate<K extends keyof typeof i18nKeys>(key: K, params?: Record<string, unknown>) {
    return origTranslate(key.toString(), params);
}
