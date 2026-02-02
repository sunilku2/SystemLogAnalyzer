using Microsoft.AspNetCore.Mvc;

namespace LogAnalyzerWeb.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProxyController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ProxyController> _logger;
    private const string PythonApiBaseUrl = "http://localhost:5000";

    public ProxyController(IHttpClientFactory httpClientFactory, ILogger<ProxyController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    [HttpGet("health")]
    public async Task<IActionResult> GetHealth()
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            var response = await client.GetAsync($"{PythonApiBaseUrl}/api/health");
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error connecting to Python API");
            return StatusCode(503, new { error = "Python API service unavailable", message = ex.Message });
        }
    }

    [HttpGet("models")]
    public async Task<IActionResult> GetModels([FromQuery] string? provider = null)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            var url = $"{PythonApiBaseUrl}/api/models/available";
            if (!string.IsNullOrEmpty(provider))
                url += $"?provider={provider}";
                
            var response = await client.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching models");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("config")]
    public async Task<IActionResult> GetConfig()
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            var response = await client.GetAsync($"{PythonApiBaseUrl}/api/config");
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching config");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions()
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            var response = await client.GetAsync($"{PythonApiBaseUrl}/api/logs/sessions");
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching sessions");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("analyze")]
    public async Task<IActionResult> RunAnalysis([FromBody] AnalysisRequest request)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromMinutes(5); // Analysis may take time
            
            var response = await client.PostAsJsonAsync($"{PythonApiBaseUrl}/api/analyze", request);
            var content = await response.Content.ReadAsStringAsync();
            
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, content);
                
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error running analysis");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("latest-report")]
    public async Task<IActionResult> GetLatestReport()
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            var response = await client.GetAsync($"{PythonApiBaseUrl}/api/reports/latest");
            var content = await response.Content.ReadAsStringAsync();
            
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, content);
                
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching latest report");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

public class AnalysisRequest
{
    public bool UseLlm { get; set; }
    public string? Model { get; set; }
    public string? Provider { get; set; }
}
