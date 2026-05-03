using System.Text.Json.Serialization;

namespace TimeIn.API.DTOs;

public class ClickUpTaskListResponse
{
    [JsonPropertyName("tasks")]
    public List<ClickUpTask> Tasks { get; set; } = new();
}

public class ClickUpTask
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("status")]
    public ClickUpTaskStatus? Status { get; set; }

    [JsonPropertyName("priority")]
    public ClickUpTaskPriority? Priority { get; set; }

    [JsonPropertyName("time_estimate")]
    public long? TimeEstimate { get; set; }

    [JsonPropertyName("list")]
    public ClickUpTaskList? List { get; set; }
}

public class ClickUpTaskList
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
}

public class ClickUpTaskStatus
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
}

public class ClickUpTaskPriority
{
    [JsonPropertyName("priority")]
    public string? Priority { get; set; }
}

public class ClickUpSyncResult
{
    public int Created { get; set; }
    public int Updated { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class ClickUpTaskSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public double? EstimatedHours { get; set; }
    public string Url => $"https://app.clickup.com/t/{Id}";
}

public class ClickUpWebhookEvent
{
    [JsonPropertyName("webhook_id")]
    public string WebhookId { get; set; } = string.Empty;

    [JsonPropertyName("event")]
    public string Event { get; set; } = string.Empty;

    [JsonPropertyName("task_id")]
    public string? TaskId { get; set; }
}

public class ClickUpWebhookRegistrationResponse
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("webhook")]
    public ClickUpWebhookDetails? Webhook { get; set; }
}

public class ClickUpWebhookDetails
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("secret")]
    public string Secret { get; set; } = string.Empty;
}
