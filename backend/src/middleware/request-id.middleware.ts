import type { NextFunction, Request, Response } from 'express';
import { newRequestId } from '../shared';
import { runWithRequestContext } from '../observability/request-context';

const INBOUND_HEADER = 'x-request-id';
const OUTBOUND_HEADER = 'x-request-id';
const SAFE_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.header(INBOUND_HEADER);
  const requestId = inbound && SAFE_PATTERN.test(inbound) ? inbound : newRequestId();

  req.requestId = requestId;
  res.setHeader(OUTBOUND_HEADER, requestId);

  runWithRequestContext({ requestId }, next);
}
