using Microsoft.AspNetCore.SignalR;

namespace Backend.Hubs;

public class LogisticsHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }
}
