// Public API for catalog operations — import only from here.
// These endpoints live under /superadmin/catalog/ and are not covered by any
// flow document; see the type definitions for what that means for their shapes.
export { PortsPage } from "./components/PortsPage";
export { AnchorageDrawer } from "./components/AnchorageDrawer";

export {
  useGetPortsQuery,
  useCreatePortMutation,
  useUpdatePortMutation,
  useDeletePortMutation,
} from "./api/portApi";

export { useGetAnchoragesQuery, useCreateAnchorageMutation } from "./api/anchorageApi";

export type {
  Anchorage,
  AnchoragePayload,
  Port,
  PortPayload,
} from "./types/catalogOps.types";
