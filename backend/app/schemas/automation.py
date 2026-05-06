from datetime import datetime
from pydantic import BaseModel
from typing import Dict, Optional, Any

class AutomationRuleBase(BaseModel):
    severity_rules: Dict[str, str]
    priority_mapping: Dict[str, str]
    status_mapping: Dict[str, str]

class AutomationRuleUpdate(AutomationRuleBase):
    pass

class AutomationRuleResponse(AutomationRuleBase):
    id: int

    class Config:
        from_attributes = True

class RedmineConfigBase(BaseModel):
    enabled: bool = False
    enable_automation: bool = False
    url: str = ""
    api_key: str = ""
    project_id: str = ""
    tracker_id: Optional[int] = None
    default_assignee_id: Optional[int] = None
    auto_close_resolved_ticket: bool = False

class RedmineConfigUpdate(RedmineConfigBase):
    pass

class RedmineConfigResponse(RedmineConfigBase):
    id: int

    class Config:
        from_attributes = True

class SchedulerJobBase(BaseModel):
    is_enabled: bool = False
    interval_minutes: int = 10

class SchedulerJobUpdate(SchedulerJobBase):
    pass

class SchedulerJobResponse(SchedulerJobBase):
    id: int
    name: str
    last_run: Optional[datetime]
    status: str

    class Config:
        from_attributes = True

class TicketAuditLogResponse(BaseModel):
    id: int
    redmine_issue_id: Optional[int]
    finding_id: Optional[int]
    status: str
    details: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
