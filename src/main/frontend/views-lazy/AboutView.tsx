import {translate} from "@vaadin/hilla-react-i18n";
import CommonMessage from "Frontend/utils/common";

export default function AboutView() {
    return <>
        <h3>{translate("about.title")}</h3>
        <p>{translate("about.text")}</p>
        <CommonMessage />
        <p>{translate('same-key')}</p>
    </>;
}
