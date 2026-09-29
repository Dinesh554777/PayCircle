import logging
import json
import traceback
from datetime import datetime
from contextvars import ContextVar

# Context var for storing correlation ID per request
request_id_ctx_var: ContextVar[str] = ContextVar("request_id", default="")

class StructuredFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_ctx_var.get(),
        }
        
        if record.exc_info:
            log_data["exception"] = "".join(traceback.format_exception(*record.exc_info))
            
        # Add any extra args as fields, avoiding sensitive ones
        if hasattr(record, "extra_info"):
            log_data.update(record.extra_info)

        return json.dumps(log_data)

def setup_logging():
    logger = logging.getLogger("paycircle")
    logger.setLevel(logging.INFO)
    
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(StructuredFormatter())
        logger.addHandler(handler)
    
    return logger

logger = setup_logging()
