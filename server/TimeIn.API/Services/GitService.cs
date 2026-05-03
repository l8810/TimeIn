using System.Diagnostics;
using TimeIn.API.DTOs;

namespace TimeIn.API.Services;

public class GitService
{
    private static async Task<string?> RunGit(string args, string workDir)
    {
        try
        {
            var psi = new ProcessStartInfo("git", args)
            {
                WorkingDirectory = workDir,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            using var process = Process.Start(psi);
            if (process == null) return null;
            var output = await process.StandardOutput.ReadToEndAsync();
            await process.WaitForExitAsync();
            return process.ExitCode == 0 ? output.Trim() : null;
        }
        catch { return null; }
    }

    public async Task<GitInfoDto> GetRepoInfoAsync()
    {
        // Walk up from the server directory to find the repo root
        var dir = AppContext.BaseDirectory;
        while (dir != null && !Directory.Exists(Path.Combine(dir, ".git")))
            dir = Directory.GetParent(dir)?.FullName;

        if (dir == null)
            return new GitInfoDto { IsRepo = false };

        var remote   = await RunGit("remote get-url origin", dir);
        var branch   = await RunGit("rev-parse --abbrev-ref HEAD", dir);
        var hash     = await RunGit("log -1 --format=%h", dir);
        var message  = await RunGit("log -1 --format=%s", dir);
        var author   = await RunGit("log -1 --format=%an", dir);
        var date     = await RunGit("log -1 --format=%ci", dir);

        return new GitInfoDto
        {
            IsRepo = true,
            RemoteUrl = remote,
            Branch = branch,
            LastCommitHash = hash,
            LastCommitMessage = message,
            LastCommitAuthor = author,
            LastCommitDate = date
        };
    }
}
