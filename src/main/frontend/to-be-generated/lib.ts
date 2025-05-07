export const _$i18nKeyMarker$_ = Symbol('i18nKey');
export type TranslationKey = Readonly<{
    // ['_$i18nKeyMarker$_']: typeof _$i18nKeyMarker$_,
    default: string,
}>;

type KeyOrRecord = TranslationKey | Readonly<{[p: string]: KeyOrRecord}>;
export type I18nKeyRecord = Readonly<Record<string, KeyOrRecord>>;
