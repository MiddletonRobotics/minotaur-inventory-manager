import "server-only";

import type { LogMetadata } from "@/server/logger";
import { logger } from "@/server/logger";
import type { Session } from "@/server/session";

export function createActionLogger(scope: string) {
    const log = logger.child(scope);

    function actor(session: Session) {
        return {
            userId: Number(session.user.id),
            role: session.user.role,
        };
    }

    return {
        rejected(session: Session, action: string, reason: string, metadata: LogMetadata = {}) {
            return log.warn(`${action} rejected`, {
                ...metadata,
                ...actor(session),
                reason,
            });
        },

        completed(session: Session, action: string, metadata: LogMetadata = {}) {
            return log.info(`${action} completed`, {
                ...metadata,
                ...actor(session),
            });
        },

        debug(session: Session, action: string, metadata: LogMetadata = {}) {
            return log.debug(action, {
                ...metadata,
                ...actor(session),
            });
        },
    };
}
