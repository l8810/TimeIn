namespace TimeIn.API.Models;

public class Team
{
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public int? LeaderId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? Leader { get; set; }
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Project> Projects { get; set; } = new List<Project>();
}
