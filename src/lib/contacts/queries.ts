import { queryOptions } from "@tanstack/react-query";
import { listContactWorkspace } from "./contacts.functions";

export const contactsQueryOptions = queryOptions({ queryKey: ["contacts-workspace"], queryFn: () => listContactWorkspace() });
export type ContactWorkspace = Awaited<ReturnType<typeof listContactWorkspace>>;