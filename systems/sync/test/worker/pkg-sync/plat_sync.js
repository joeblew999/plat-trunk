/* @ts-self-types="./plat_sync.d.ts" */

import * as wasm from "./plat_sync_bg.wasm";
import { __wbg_set_wasm } from "./plat_sync_bg.js";
__wbg_set_wasm(wasm);
wasm.__wbindgen_start();
export {
    apply_op, create_doc, doc_hash, export_ops_since, get_name, get_op_count, get_ops, get_replay_ops, merge_docs, merge_docs_with_info, rollback_to, set_group_enabled, set_name, set_op_enabled, start, validate_op
} from "./plat_sync_bg.js";
