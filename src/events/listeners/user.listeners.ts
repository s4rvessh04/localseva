import { eventBus } from "../index.js";
import { UserEvents } from "../events.js";

// Mail events
import { sendUserCreatedMail } from "../../modules/mails/users.js";


eventBus.on(UserEvents.USER_CREATED, sendUserCreatedMail)
