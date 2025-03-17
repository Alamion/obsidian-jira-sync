---
key: 
assignee: 
summary: 
status: 
deadline: 
lastViewed: 
tags:  
- task  
---
`BUTTON[get]` `BUTTON[update]`
`BUTTON[status]` `BUTTON[worklogs]`
### Time spent

```timekeep  
{"entries":[]}  
```  


### Deadline
`INPUT[datePicker:deadline]`

### Description
`jira-sync-section-description`

### Progress
`jira-sync-line-progressPercentage`

### People
`jira-sync-line-assignee`

`jira-sync-line-reporter`

`jira-sync-line-creator`





```meta-bind-button
label: Create worklog
hidden: true
id: worklogs
style: default
actions:
  - type: command
    command: jira-sync:update-work-log-jira
```

```meta-bind-button
label: Update status
hidden: true
id: status
style: default
actions:
  - type: command
    command: jira-sync:update-issue-status-jira
```

```meta-bind-button
label: Update issue
hidden: true
id: update
style: default
actions:
  - type: command
    command: jira-sync:update-issue-jira
```

```meta-bind-button
label: Get issue
hidden: true
id: get
style: default
actions:
  - type: command
    command: jira-sync:get-issue-jira
```
