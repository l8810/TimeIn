namespace TimeIn.API.DTOs;

public class IntegrationStatusDto
{
    public ClickUpStatusDto ClickUp { get; set; } = new();
}

public class ClickUpStatusDto
{
    public bool IsConnected { get; set; }
    public string? WorkspaceName { get; set; }
    public string? WorkspaceId { get; set; }
    public bool WebhookConfigured { get; set; }
    public List<ProjectMappingDto> ProjectMappings { get; set; } = new();
}

public class ProjectMappingDto
{
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string? ClickUpListId { get; set; }
    public DateTime? LastSyncedAt { get; set; }
    public int? TasksSynced { get; set; }
}

public class UpdateMappingRequest
{
    public string? ClickUpListId { get; set; }
}

public class GitInfoDto
{
    public bool IsRepo { get; set; }
    public string? RemoteUrl { get; set; }
    public string? Branch { get; set; }
    public string? LastCommitHash { get; set; }
    public string? LastCommitMessage { get; set; }
    public string? LastCommitAuthor { get; set; }
    public string? LastCommitDate { get; set; }
}

public class ClickUpWorkspaceResponse
{
    [System.Text.Json.Serialization.JsonPropertyName("teams")]
    public List<ClickUpTeamInfo> Teams { get; set; } = new();
}

public class ClickUpTeamInfo
{
    [System.Text.Json.Serialization.JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}

public class ConnectionSettingsDto
{
    public string ClickUpApiKeyMasked { get; set; } = string.Empty;
    public bool ClickUpApiKeyConfigured { get; set; }
    public string GitRemoteUrl { get; set; } = string.Empty;
}

public class UpdateConnectionSettingsRequest
{
    public string? ClickUpApiKey { get; set; }
    public string? GitRemoteUrl { get; set; }
}

public class TestClickUpKeyRequest
{
    public string ApiKey { get; set; } = string.Empty;
}

public class TestClickUpKeyResponse
{
    public bool IsConnected { get; set; }
    public string? WorkspaceName { get; set; }
}
