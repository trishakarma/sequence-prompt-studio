export type Step={id:string;name:string;kind:'text'|'vision'|'image';prompt:string;model?:string;temperature?:number};
export type Chain={id:string;name:string;description:string;steps:Step[];updated_at:string};
export type Run={id:string;input_image?:string|null;chain_id:string;chain_name:string;created_at:string;status:string;outputs:{name:string;text:string;image?:string}[];error:string|null};
