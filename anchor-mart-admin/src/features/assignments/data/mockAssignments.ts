import type { Assignment, AvailablePartner, UnassignedOrder } from "../types/assignment.types";

// Static mock data for the Order Assignments page. Replace with an RTK Query
// feed once the backend endpoints are available (see assignment.types.ts).

export const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: "#AM2461",
    enquiry: "ENQ-0042",
    partner: "Rahul Singh",
    order: "#AM2461",
    shop: "Wegmans PSA",
    deliverTo: "MSC Marvela·B7",
    status: "Delivering",
    eta: "12:02 PM",
  },
  {
    id: "#AM2463",
    enquiry: "ENQ-0047",
    partner: "Pita Havili",
    order: "#AM2463",
    shop: "EuroSpar Keppel",
    deliverTo: "Evergreen·Brani",
    status: "Verifying",
    eta: "3:00 PM",
  },
  {
    id: "#AM2458",
    enquiry: "ENQ-0039",
    partner: "Marco Reyes",
    order: "#AM2458",
    shop: "Port Marine",
    deliverTo: "APL Vanda·B14",
    status: "Delivering",
    eta: "11:45 AM",
  },
  {
    id: "#AM2467",
    enquiry: "ENQ-0051",
    partner: "Rahul Singh",
    order: "#AM2467",
    shop: "Wegmans PSA",
    deliverTo: "IMO 0123456",
    status: "New",
    eta: "1:30 PM",
  },
];

export const MOCK_UNASSIGNED: UnassignedOrder[] = [
  {
    id: "#AM2467",
    orderId: "AM2467",
    sailor: "Ravi Patel",
    items: "Express items ×6",
    port: "PSA Terminal",
    priority: "High",
  },
  {
    id: "#AM2469",
    orderId: "AM2469",
    sailor: "Omar Karim",
    items: "Water Bottle, Tablets ×2",
    port: "Keppel",
    priority: "Normal",
  },
];

export const MOCK_PARTNERS: AvailablePartner[] = [
  { id: "DP-00056", name: "Aisha Karimi", location: "Singapore", status: "Free" },
  { id: "DP-00033", name: "David Lim", location: "Jurong", status: "Free" },
  { id: "DP-00087", name: "Pita Havili", location: "2 active orders", status: "Busy", busy: true },
];
