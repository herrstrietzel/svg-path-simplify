import { simplifyPathData } from "./pathSimplify-only-pathdata";
export {simplifyPathData as simplifyPathData}

if (typeof window !== 'undefined') {
    window.simplifyPathData = simplifyPathData;
}
