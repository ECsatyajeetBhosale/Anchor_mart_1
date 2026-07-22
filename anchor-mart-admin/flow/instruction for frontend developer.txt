This project uses a single Flow-wise API Documentation shared across all platforms.

Each flow represents one complete business journey and may include APIs from:

- Customer App
- Admin Panel
- Delivery Partner App
- Background System

Do NOT try to implement every API in the flow.

Instead, follow this process.

----------------------------------------------------
Step 1
----------------------------------------------------

Read the complete flow from beginning to end.

Understand:

- Why the flow exists.
- What business problem it solves.
- The complete end-to-end journey.
- How Customer, Admin, Delivery Partner, and Background System interact.

Do not skip APIs belonging to other platforms.

Understanding the whole flow is important before implementing your own part.

----------------------------------------------------
Step 2
----------------------------------------------------

Identify only the APIs that belong to your platform.

Examples

Customer Developer
→ Implement only Customer APIs.

Admin Developer
→ Implement only Admin APIs.

Delivery Partner Developer
→ Implement only Partner APIs.

Ignore implementation of other platform APIs.

----------------------------------------------------
Step 3
----------------------------------------------------

For every API belonging to your platform understand:

- Purpose
- Business reason
- When it should be called
- Preconditions
- Request
- Response
- Possible errors
- Next API
- Previous API

----------------------------------------------------
Step 4
----------------------------------------------------

Understand the interaction between platforms.

Know:

- Which platform starts the flow.
- Which platform acts next.
- Which platform waits.
- Which platform completes the flow.

This helps you correctly manage UI states, polling, refreshes, notifications, and user navigation.

----------------------------------------------------
Step 5
----------------------------------------------------

Implement only your platform.

Do NOT modify APIs belonging to another platform.

If another platform's implementation is incomplete or unavailable:

- Mock the response if necessary.
- Continue implementing your platform independently.

----------------------------------------------------
Step 6
----------------------------------------------------

Before marking your work complete verify:

✓ Every API belonging to your platform is implemented.

✓ Request format matches documentation.

✓ Response handling matches documentation.

✓ Error handling matches documentation.

✓ Navigation follows the documented flow.

✓ UI states match the business flow.

✓ No undocumented assumptions were introduced.

----------------------------------------------------
Final Goal
----------------------------------------------------

Every frontend developer should understand the complete business flow,
but implement only the APIs that belong to their assigned platform.

The Flow-wise API Documentation is the single source of truth.

If implementation differs from the documentation,
raise the issue instead of making assumptions.

