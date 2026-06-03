import { Request } from 'express';
import { User } from 'src/entities/user.entity';

declare global {
  interface ContextualRequest extends Request {
    user?: Partial<User>;
    requestId?: string;
    nodeId?: string;
  }

  interface TokenPayload {
    id: string;
  }
}

export {}; // Ensures this file is treated as a module by TypeScript.
